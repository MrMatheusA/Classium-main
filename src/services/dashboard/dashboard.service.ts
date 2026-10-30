import { studentsService } from '../students/students.service';
import { teachersService } from '../teachers/teachers.service';
import { classesService } from '../classes/classes.service';
import { communicationsService } from '../communications/communications.service';

export interface DashboardMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  recentCommunications: any[];
  // Add other metrics as needed
}

export const DashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      // Execute multiple queries in parallel for better performance
      const [
        totalStudents,
        totalTeachers,
        totalClasses,
        recentCommunications
      ] = await Promise.all([
        studentsService.count(),
        teachersService.count(),
        classesService.count(),
        communicationsService.getAll({
          limit: 5,
          orderBy: { column: 'created_at', ascending: false }
        })
      ]);

      return {
        totalStudents,
        totalTeachers,
        totalClasses,
        recentCommunications
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw new Error('Falha ao carregar métricas do dashboard.');
    }
  }
};
