-- Users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Categories & Tags (Public read)
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Tags are viewable by everyone" ON tags FOR SELECT USING (true);

-- Courses
CREATE POLICY "Courses are viewable by everyone" ON courses FOR SELECT USING (status = 'published');
CREATE POLICY "Instructors can manage their courses" ON courses FOR ALL USING (auth.uid() = instructor_id);

-- Modules & Lessons
CREATE POLICY "Modules are viewable by everyone" ON modules FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = modules.course_id AND courses.status = 'published')
);
CREATE POLICY "Lessons are viewable by everyone" ON lessons FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM modules
        JOIN courses ON courses.id = modules.course_id
        WHERE modules.id = lessons.module_id AND courses.status = 'published'
    )
);

-- Enrollments
CREATE POLICY "Users can view own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON enrollments FOR UPDATE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Certificates
CREATE POLICY "Users can view own certificates" ON certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Certificates are viewable by everyone" ON certificates FOR SELECT USING (true);

-- Reviews
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Support Tickets
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Forum Posts
CREATE POLICY "Forum posts are viewable by everyone" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create forum posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forum posts" ON forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum posts" ON forum_posts FOR DELETE USING (auth.uid() = user_id);

-- Forum Replies
CREATE POLICY "Forum replies are viewable by everyone" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Users can create forum replies" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forum replies" ON forum_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum replies" ON forum_replies FOR DELETE USING (auth.uid() = user_id);

-- Admins have all access to all tables (Bypass RLS can also be used, but explicitly defining for safety if not using service_role)
-- This is handled by service_role for backend operations.
