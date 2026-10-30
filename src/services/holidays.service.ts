export interface Holiday {
  date: string;
  name: string;
  type: 'national' | 'recesso';
}

// Official Brazilian National Holidays with accurate movable calculation (Easter, Carnival, Good Friday, Corpus Christi)
function getStandardBrazilianHolidays(year: number): Holiday[] {
  // Anonymous Gregorian Easter algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(Date.UTC(year, month - 1, day));

  const addDays = (d: Date, days: number): string => {
    const res = new Date(d.getTime() + days * 86400000);
    return res.toISOString().split('T')[0];
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return [
    { date: `${year}-01-01`, name: 'Confraternização Universal', type: 'national' },
    { date: addDays(easterDate, -48), name: 'Recesso Escolar (Carnaval)', type: 'recesso' },
    { date: addDays(easterDate, -47), name: 'Carnaval (Terça-feira)', type: 'national' },
    { date: addDays(easterDate, -2), name: 'Sexta-feira Santa (Paixão de Cristo)', type: 'national' },
    { date: addDays(easterDate, 0), name: 'Páscoa', type: 'national' },
    { date: `${year}-04-21`, name: 'Tiradentes', type: 'national' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'national' },
    { date: addDays(easterDate, 60), name: 'Corpus Christi', type: 'national' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida (Padroeira do Brasil)', type: 'national' },
    { date: `${year}-11-02`, name: 'Finados', type: 'national' },
    { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national' },
    { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'national' },
    { date: `${year}-12-25`, name: 'Natal', type: 'national' },
  ];
}

export class HolidayService {
  private static cache: Record<number, Holiday[]> = {};

  static async getHolidays(year: number): Promise<Holiday[]> {
    if (this.cache[year] && this.cache[year].length > 0) {
      return this.cache[year];
    }

    try {
      // 1. Try Brasil API
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const holidays: Holiday[] = data.map((item: any) => ({
            date: item.date,
            name: item.name,
            type: 'national'
          }));
          this.cache[year] = holidays;
          return holidays;
        }
      }
    } catch (error) {
      console.warn('[HolidayService] BrasilAPI failed, attempting server endpoint /api/calendar/holidays:', error);
    }

    try {
      // 2. Try server internal API
      const srvRes = await fetch(`/api/calendar/holidays?year=${year}`);
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.success && Array.isArray(srvData.holidays) && srvData.holidays.length > 0) {
          this.cache[year] = srvData.holidays;
          return srvData.holidays;
        }
      }
    } catch (e) {
      console.warn('[HolidayService] Local server holiday route warning:', e);
    }

    // 3. Fallback to algorithmic Brazilian national holidays
    const standards = getStandardBrazilianHolidays(year);
    this.cache[year] = standards;
    return standards;
  }
}
