const fs = require('fs');

let code = fs.readFileSync('./server.ts', 'utf8');

const oldStudentChunk = code.substring(
  code.indexOf('// POST /api/students (Create Student)'),
  code.indexOf('// PATCH /api/students/status')
);

const newStudentChunk = `// POST /api/students (Create Student Transactional)
  app.post("/api/students", async (req, res) => {
    try {
      const {
        organization_id,
        full_name,
        name,
        birth_date,
        document_number,
        cpf,
        registration_code,
        sex,
        gender,
        status,
        class_id,
        class_name,
        shift,
        guardians,
        uses_transport,
        transport_required,
        aee,
        laudo,
        dietary_info,
        medical_notes,
        address_cep,
        address_street,
        address_number,
        address_neighborhood,
        address_city,
        address_state,
        address_complement
      } = req.body;

      const studentName = full_name || name;
      if (!studentName) {
        return res.status(400).json({ error: "Nome do estudante é obrigatório." });
      }

      const orgId = organization_id || req.headers['x-organization-id'] || '11111111-1111-1111-1111-111111111111';
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : ('st-' + Date.now());
      const generatedCode = registration_code || ('RA-2026-' + Math.floor(100 + Math.random() * 900));
      const studentGender = sex || gender || 'M';
      const studentTransport = !!(uses_transport || transport_required);
      const primaryGuardian = Array.isArray(guardians) && guardians.length > 0
        ? (guardians.find((g) => g.is_primary || g.isPrimary || g.isFinancial) || guardians[0])
        : null;

      const newStudent = {
        id: newId,
        student_id: newId,
        organization_id: orgId,
        school_id: orgId,
        full_name: studentName,
        name: studentName,
        registration_code: generatedCode,
        birth_date: birth_date || '',
        document_number: document_number || cpf || '',
        cpf: document_number || cpf || '',
        sex: studentGender,
        gender: studentGender,
        status: status || 'Matriculado',
        uses_transport: studentTransport,
        transport_required: studentTransport,
        aee: !!aee,
        laudo: !!laudo,
        dietary_info: dietary_info || '',
        medical_notes: medical_notes || '',
        address_cep: address_cep || '',
        address_street: address_street || '',
        address_number: address_number || '',
        address_neighborhood: address_neighborhood || '',
        address_city: address_city || '',
        address_state: address_state || '',
        address_complement: address_complement || '',
        class_id: class_id || null,
        class_name: class_name || '',
        created_at: new Date().toISOString(),
        classes: class_name ? [{ id: class_id || ('cls-' + Date.now()), name: class_name, class_name, shift: shift || 'Matutino' }] : [],
        guardians: Array.isArray(guardians) ? guardians : []
      };

      const sb = getSupabaseServerClient();
      if (sb) {
        try {
          // 1. Insert into public.students
          const insertStudentPayload = {
            id: newId,
            organization_id: orgId,
            school_id: orgId,
            full_name: studentName,
            name: studentName,
            registration_code: generatedCode,
            birth_date: birth_date || null,
            cpf: document_number || cpf || null,
            document_number: document_number || cpf || null,
            gender: studentGender,
            sex: studentGender,
            status: status || 'Matriculado',
            uses_transport: studentTransport,
            has_special_needs: !!aee,
            allergies: dietary_info || null,
            medical_conditions: medical_notes || null,
            class_id: class_id || null,
            address: address_street || null,
            neighborhood: address_neighborhood || null,
            city: address_city || null,
            state: address_state || null,
            postal_code: address_cep || null
          };

          if (primaryGuardian) {
            insertStudentPayload.guardian_name = primaryGuardian.full_name || primaryGuardian.name;
            insertStudentPayload.guardian_phone = primaryGuardian.phone;
            insertStudentPayload.guardian_relationship = primaryGuardian.relationship;
            insertStudentPayload.guardian_cpf = primaryGuardian.cpf || primaryGuardian.document_number;
          }

          const { error: studentInsertErr } = await sb.from('students').insert(insertStudentPayload);
          if (studentInsertErr) {
            console.warn('[POST /api/students] Supabase student insert warning:', studentInsertErr.message);
          }

          // 2. Insert or find Guardians and create links in student_responsible_links and family_links
          if (Array.isArray(guardians) && guardians.length > 0) {
            for (const g of guardians) {
              const guardianName = g.full_name || g.name;
              const guardianCpf = (g.cpf || g.document_number || '').replace(/\\D/g, '');
              if (!guardianName && !guardianCpf) continue;

              let guardianId = g.id || g.guardian_id;
              if (!guardianId || String(guardianId).startsWith('gd-') || String(guardianId).startsWith('g-')) {
                // Check if guardian exists by CPF in public.guardians
                if (guardianCpf) {
                  const { data: existingG } = await sb
                    .from('guardians')
                    .select('id')
                    .eq('cpf', guardianCpf)
                    .maybeSingle();
                  if (existingG) {
                    guardianId = existingG.id;
                  }
                }
              }

              if (!guardianId || String(guardianId).startsWith('gd-') || String(guardianId).startsWith('g-')) {
                guardianId = typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : ('gd-' + Date.now());
                await sb.from('guardians').insert({
                  id: guardianId,
                  organization_id: orgId,
                  school_id: orgId,
                  full_name: guardianName || 'Responsável',
                  name: guardianName || 'Responsável',
                  cpf: g.cpf || g.document_number || null,
                  email: g.email || null,
                  phone: g.phone || null,
                  kinship: g.relationship || 'Responsável',
                  status: 'active'
                });
              }

              // Insert student_responsible_links
              const srlId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : ('srl-' + Date.now());
              await sb.from('student_responsible_links').insert({
                id: srlId,
                organization_id: orgId,
                student_id: newId,
                guardian_id: guardianId,
                guardian_name: guardianName || 'Responsável',
                relationship: g.relationship || 'Responsável',
                is_primary_contact: !!(g.is_primary || g.isPrimary || g.isFinancial),
                is_financial_responsible: !!(g.is_financial || g.isFinancial),
                is_pedagogical_responsible: true,
                can_pickup: true
              });

              // Insert family_links
              const flId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : ('fl-' + Date.now());
              await sb.from('family_links').insert({
                id: flId,
                organization_id: orgId,
                student_id: newId,
                guardian_id: guardianId
              });

              // Also student_guardians
              try {
                await sb.from('student_guardians').insert({
                  student_id: newId,
                  guardian_id: guardianId,
                  relationship: g.relationship || 'Responsável'
                });
              } catch (_) {}
            }
          }

          // 3. Insert class_students link if class_id provided
          if (class_id) {
            const csId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : ('cs-' + Date.now());
            await sb.from('class_students').insert([{
              id: csId,
              organization_id: orgId,
              class_id: class_id,
              student_id: newId,
              status: 'active'
            }]);
          }
        } catch (e) {
          console.warn('[POST /api/students] Supabase multi-table transaction notice:', e);
        }
      }

      const list = readStudentsFile();
      list.unshift(newStudent);
      writeStudentsFile(list);

      return res.status(201).json({ success: true, student: newStudent, data: newStudent, ok: true });
    } catch (err: any) {
      console.error('[POST /api/students] Error:', err);
      return res.status(500).json({ error: err.message || "Erro ao cadastrar estudante." });
    }
  });

  // PUT /api/students/:id and PUT /api/students (Update Student)
  const handleUpdateStudent = async (req: any, res: any) => {
    try {
      const targetId = req.params?.id || req.body.id || req.body.student_id;
      if (!targetId) {
        return res.status(400).json({ error: "ID do estudante é obrigatório." });
      }

      const updateData = req.body.payload || req.body;
      const list = readStudentsFile();
      const index = list.findIndex((s: any) => s.id === targetId || s.student_id === targetId);
      let updatedStudent = null;

      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...updateData,
          updated_at: new Date().toISOString()
        };
        updatedStudent = list[index];
        writeStudentsFile(list);
      }

      const sb = getSupabaseServerClient();
      if (sb) {
        try {
          const cleanPayload: any = {};
          if (updateData.full_name || updateData.name) {
            cleanPayload.full_name = updateData.full_name || updateData.name;
            cleanPayload.name = updateData.full_name || updateData.name;
          }
          if (updateData.registration_code) cleanPayload.registration_code = updateData.registration_code;
          if (updateData.birth_date) cleanPayload.birth_date = updateData.birth_date;
          if (updateData.document_number || updateData.cpf) {
            cleanPayload.cpf = updateData.document_number || updateData.cpf;
            cleanPayload.document_number = updateData.document_number || updateData.cpf;
          }
          if (updateData.status) cleanPayload.status = updateData.status;
          if (updateData.sex || updateData.gender) {
            cleanPayload.sex = updateData.sex || updateData.gender;
            cleanPayload.gender = updateData.sex || updateData.gender;
          }
          if (updateData.uses_transport !== undefined) {
            cleanPayload.uses_transport = !!updateData.uses_transport;
          }
          if (updateData.transport_required !== undefined) {
            cleanPayload.uses_transport = !!updateData.transport_required;
          }
          if (updateData.class_id !== undefined) {
            cleanPayload.class_id = updateData.class_id;
          }
          if (updateData.address_street) cleanPayload.address = updateData.address_street;
          if (updateData.address_neighborhood) cleanPayload.neighborhood = updateData.address_neighborhood;
          if (updateData.address_city) cleanPayload.city = updateData.address_city;
          if (updateData.address_state) cleanPayload.state = updateData.address_state;
          if (updateData.address_cep) cleanPayload.postal_code = updateData.address_cep;

          if (Object.keys(cleanPayload).length > 0) {
            await sb.from('students').update(cleanPayload).eq('id', targetId);
          }

          if (updateData.class_id) {
            const orgId = req.headers['x-organization-id'] || '11111111-1111-1111-1111-111111111111';
            await sb.from('class_students').delete().eq('student_id', targetId);
            const csId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('cs-' + Date.now());
            await sb.from('class_students').insert([{
              id: csId,
              organization_id: orgId,
              class_id: updateData.class_id,
              student_id: targetId,
              status: 'active'
            }]);
          }
        } catch (e) {
          console.warn('[PUT /api/students] Supabase update notice:', e);
        }
      }

      return res.json({ success: true, student: updatedStudent, data: updatedStudent, ok: true });
    } catch (err: any) {
      console.error('[PUT /api/students] Error:', err);
      return res.status(500).json({ error: err.message || "Erro ao atualizar estudante." });
    }
  };

  app.put("/api/students/:id", handleUpdateStudent);
  app.put("/api/students", handleUpdateStudent);

  // DELETE /api/students/:id and DELETE /api/students (Delete Student)
  const handleDeleteStudent = async (req: any, res: any) => {
    try {
      const targetId = req.params?.id || req.body?.id || req.body?.student_id;
      if (!targetId) {
        return res.status(400).json({ error: "ID do estudante é obrigatório." });
      }

      const list = readStudentsFile();
      const updatedList = list.filter((s: any) => s.id !== targetId && s.student_id !== targetId);
      writeStudentsFile(updatedList);

      const sb = getSupabaseServerClient();
      if (sb) {
        try {
          await sb.from('family_links').delete().eq('student_id', targetId);
          await sb.from('student_responsible_links').delete().eq('student_id', targetId);
          await sb.from('class_students').delete().eq('student_id', targetId);
          await sb.from('student_guardians').delete().eq('student_id', targetId);
          await sb.from('students').delete().eq('id', targetId);
        } catch (e) {
          console.warn('[DELETE /api/students] Supabase delete notice:', e);
        }
      }

      return res.json({ success: true, ok: true, message: "Estudante excluído com sucesso." });
    } catch (err: any) {
      console.error('[DELETE /api/students] Error:', err);
      return res.status(500).json({ error: err.message || "Erro ao excluir estudante." });
    }
  };

  app.delete("/api/students/:id", handleDeleteStudent);
  app.delete("/api/students", handleDeleteStudent);
  `;

code = code.replace(oldStudentChunk, newStudentChunk);

// Replacement for family link routes
const oldFamilyChunk = code.substring(
  code.indexOf('app.get("/api/family/linked-students"'),
  code.indexOf('// POST /api/family/unlink-student')
);

const newFamilyChunk = `app.get("/api/family/linked-students", async (req, res) => {
    try {
      const guardianCpf = (req.query.cpf as string || '').replace(/\\D/g, '');
      const guardianName = (req.query.name as string || '').trim();
      const sb = getSupabaseServerClient();

      if (sb) {
        try {
          let matchedStudentIds = new Set<string>();

          if (guardianCpf) {
            const { data: gList } = await sb.from('guardians').select('id').eq('cpf', guardianCpf);
            if (gList && gList.length > 0) {
              const gIds = gList.map(g => g.id);
              const { data: srlList } = await sb.from('student_responsible_links').select('student_id').in('guardian_id', gIds);
              if (srlList) srlList.forEach(r => matchedStudentIds.add(r.student_id));
              const { data: flList } = await sb.from('family_links').select('student_id').in('guardian_id', gIds);
              if (flList) flList.forEach(r => matchedStudentIds.add(r.student_id));
            }
            const { data: stByCpf } = await sb.from('students').select('id').eq('guardian_cpf', guardianCpf);
            if (stByCpf) stByCpf.forEach(s => matchedStudentIds.add(s.id));
          }

          if (guardianName && guardianName.length >= 3) {
            const { data: stByName } = await sb.from('students').select('id').ilike('guardian_name', '%' + guardianName + '%');
            if (stByName) stByName.forEach(s => matchedStudentIds.add(s.id));
          }

          if (matchedStudentIds.size > 0) {
            const idArray = Array.from(matchedStudentIds);
            const { data: studentRecords } = await sb.from('students').select('*').in('id', idArray);
            if (studentRecords && studentRecords.length > 0) {
              const { data: classesData } = await sb.from('classes').select('id, name, grade, shift, room');
              const classesMap = new Map((classesData || []).map((c: any) => [c.id, c]));

              const children = studentRecords.map((st: any) => {
                const cls: any = st.class_id ? classesMap.get(st.class_id) : null;
                return {
                  student_id: st.id,
                  name: st.full_name || st.name,
                  full_name: st.full_name || st.name,
                  ra: st.registration_code || 'RA-2026-OFICIAL',
                  class_name: cls?.name || 'Turma Regular',
                  grade: cls?.grade || 'Ensino Fundamental',
                  shift: cls?.shift || st.shift || 'Matutino',
                  room: cls?.room || 'Sala 01',
                  relationship: st.guardian_relationship || 'Responsável',
                  status: st.status || 'Ativo',
                  photo_url: st.avatar_url || ''
                };
              });

              return res.json({ success: true, children });
            }
          }
        } catch (err) {
          console.warn('[GET /api/family/linked-students] DB Query warning:', err);
        }
      }

      const cached = familyLinksCache[guardianCpf] || [];
      return res.json({ success: true, children: cached });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro ao consultar alunos vinculados." });
    }
  });

  // POST /api/family/link-student (Search & Link by CPF/Name with multi-tenant isolation)
  app.post("/api/family/link-student", async (req, res) => {
    try {
      const { cpf, full_name } = req.body;
      const cleanCpf = (cpf || '').replace(/\\D/g, '');
      const cleanName = (full_name || '').trim();

      if (!cleanCpf && !cleanName) {
        return res.status(400).json({
          success: false,
          message: "Informe o CPF ou o Nome do responsável para realizar a busca."
        });
      }

      const sb = getSupabaseServerClient();
      let matchedStudents: any[] = [];

      if (sb) {
        try {
          let studentIds = new Set<string>();

          // 1. Search in guardians table
          if (cleanCpf) {
            const { data: gList } = await sb.from('guardians').select('id').eq('cpf', cleanCpf);
            if (gList && gList.length > 0) {
              const gIds = gList.map(g => g.id);
              const { data: srlList } = await sb.from('student_responsible_links').select('student_id').in('guardian_id', gIds);
              if (srlList) srlList.forEach(r => studentIds.add(r.student_id));
              const { data: flList } = await sb.from('family_links').select('student_id').in('guardian_id', gIds);
              if (flList) flList.forEach(r => studentIds.add(r.student_id));
            }
            const { data: stByCpf } = await sb.from('students').select('id').eq('guardian_cpf', cleanCpf);
            if (stByCpf) stByCpf.forEach(s => studentIds.add(s.id));
          }

          // 2. Search in students by guardian_name
          if (cleanName && cleanName.length >= 3) {
            const { data: stByName } = await sb.from('students').select('id').ilike('guardian_name', '%' + cleanName + '%');
            if (stByName) stByName.forEach(s => studentIds.add(s.id));
          }

          if (studentIds.size > 0) {
            const { data: studentRecords } = await sb.from('students').select('*').in('id', Array.from(studentIds));
            if (studentRecords && studentRecords.length > 0) {
              const { data: classesData } = await sb.from('classes').select('id, name, grade, shift, room');
              const classesMap = new Map((classesData || []).map((c: any) => [c.id, c]));

              matchedStudents = studentRecords.map((st: any) => {
                const cls: any = st.class_id ? classesMap.get(st.class_id) : null;
                return {
                  student_id: st.id,
                  name: st.full_name || st.name,
                  full_name: st.full_name || st.name,
                  ra: st.registration_code || 'RA-2026-OFICIAL',
                  class_name: cls?.name || 'Turma Regular',
                  grade: cls?.grade || 'Ensino Fundamental',
                  shift: cls?.shift || st.shift || 'Matutino',
                  room: cls?.room || 'Sala 01',
                  relationship: st.guardian_relationship || 'Responsável',
                  status: st.status || 'Ativo',
                  photo_url: st.avatar_url || ''
                };
              });

              if (cleanCpf) familyLinksCache[cleanCpf] = matchedStudents;

              return res.json({
                success: true,
                message: ('Responsável vinculado com sucesso! ' + matchedStudents.length + ' estudante(s) localizado(s).'),
                children: matchedStudents
              });
            }
          }
        } catch (err: any) {
          console.warn('[POST /api/family/link-student] Error querying Supabase:', err);
        }
      }

      // If no student was found matching the criteria
      return res.status(404).json({
        success: false,
        message: "Nenhum estudante associado ao CPF ou Nome informado foi localizado nesta escola.",
        children: []
      });
    } catch (err: any) {
      console.error('[POST /api/family/link-student] Error:', err);
      return res.status(500).json({ error: err.message || "Erro ao realizar vinculação familiar." });
    }
  });
  `;

code = code.replace(oldFamilyChunk, newFamilyChunk);

fs.writeFileSync('./server.ts', code, 'utf8');
console.log('Successfully updated server.ts!');
