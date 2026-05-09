/* eslint-disable no-console */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashSync } from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Wipe everything
  await prisma.booking.deleteMany();
  await prisma.stylistService.deleteMany();
  await prisma.stylistAvailability.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.client.deleteMany();
  await prisma.stylist.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user with hashed password
  const owner = await prisma.user.create({
    data: {
      email: 'demo@openchair.dev',
      password: hashSync('demo1234', 12),
      firstName: 'Maria',
      lastName: 'Kotsifas',
      phone: '0412 000 001',
      role: 'OWNER',
    },
  });

  // Create salon
  const salon = await prisma.salon.create({
    data: {
      name: 'Luxe Hair Studio',
      slug: 'luxe-hair-studio',
      description: 'Premium hair salon in Surry Hills, Sydney',
      phone: '02 9000 1234',
      email: 'hello@luxehairstudio.com.au',
      address: '42 Crown St, Surry Hills NSW 2010',
      city: 'Sydney',
      timezone: 'Australia/Sydney',
      isActive: true,
      ownerId: owner.id,
    },
  });

  // ── Stylists ──────────────────────────────────────────────
  const stylistsData = [
    {
      name: 'Maria Kotsifas',
      email: 'maria@luxehairstudio.com.au',
      phone: '0412 000 001',
      bio: 'Owner & senior stylist. 15 years experience in colour and cuts.',
      sortOrder: 0,
    },
    {
      name: 'Jade Nguyen',
      email: 'jade@luxehairstudio.com.au',
      phone: '0412 000 002',
      bio: 'Balayage & highlights specialist. Previously at Sassoon.',
      sortOrder: 1,
    },
    {
      name: "Liam O'Brien",
      email: 'liam@luxehairstudio.com.au',
      phone: '0412 000 003',
      bio: "Precision cuts and men's grooming.",
      sortOrder: 2,
    },
    {
      name: 'Sophie Chen',
      email: 'sophie@luxehairstudio.com.au',
      phone: '0412 000 004',
      bio: 'Keratin treatments & colour correction. Korean hair techniques.',
      sortOrder: 3,
    },
  ];

  const stylists = [];
  for (const s of stylistsData) {
    const stylist = await prisma.stylist.create({
      data: { ...s, salonId: salon.id },
    });
    stylists.push(stylist);

    // Mon–Sat availability (closed Sunday)
    const schedules =
      s.name === "Liam O'Brien"
        ? [
            { day: 2, start: '10:00', end: '19:00' }, // Tue
            { day: 3, start: '10:00', end: '19:00' }, // Wed
            { day: 4, start: '10:00', end: '19:00' }, // Thu
            { day: 5, start: '10:00', end: '19:00' }, // Fri
            { day: 6, start: '09:00', end: '17:00' }, // Sat
          ]
        : [
            { day: 1, start: '09:00', end: '17:00' }, // Mon
            { day: 2, start: '09:00', end: '17:00' },
            { day: 3, start: '09:00', end: '17:00' },
            { day: 4, start: '09:00', end: '20:00' }, // Late Thu
            { day: 5, start: '09:00', end: '18:00' }, // Fri
            { day: 6, start: '09:00', end: '16:00' }, // Sat
          ];

    for (const sch of schedules) {
      await prisma.stylistAvailability.create({
        data: {
          stylistId: stylist.id,
          dayOfWeek: sch.day,
          startTime: sch.start,
          endTime: sch.end,
          isActive: true,
        },
      });
    }
  }

  // ── Service categories & services ─────────────────────────
  const catCuts = await prisma.serviceCategory.create({
    data: { name: 'Cuts & Styling', sortOrder: 0, salonId: salon.id },
  });
  const catColour = await prisma.serviceCategory.create({
    data: { name: 'Colour', sortOrder: 1, salonId: salon.id },
  });
  const catTreatments = await prisma.serviceCategory.create({
    data: { name: 'Treatments', sortOrder: 2, salonId: salon.id },
  });

  const servicesData = [
    // Cuts
    {
      name: "Women's Cut & Blow Dry",
      price: 9500,
      duration: 60,
      categoryId: catCuts.id,
      sortOrder: 0,
    },
    { name: "Men's Cut", price: 5500, duration: 30, categoryId: catCuts.id, sortOrder: 1 },
    {
      name: 'Kids Cut (under 12)',
      price: 3500,
      duration: 25,
      categoryId: catCuts.id,
      sortOrder: 2,
    },
    { name: 'Blow Dry & Style', price: 5000, duration: 45, categoryId: catCuts.id, sortOrder: 3 },
    { name: 'Fringe Trim', price: 1500, duration: 15, categoryId: catCuts.id, sortOrder: 4 },
    // Colour
    { name: 'Full Colour', price: 15000, duration: 90, categoryId: catColour.id, sortOrder: 0 },
    {
      name: 'Half Head Foils',
      price: 18000,
      duration: 120,
      categoryId: catColour.id,
      sortOrder: 1,
    },
    {
      name: 'Full Head Foils',
      price: 25000,
      duration: 150,
      categoryId: catColour.id,
      sortOrder: 2,
    },
    { name: 'Balayage', price: 28000, duration: 180, categoryId: catColour.id, sortOrder: 3 },
    { name: 'Toner / Gloss', price: 6000, duration: 30, categoryId: catColour.id, sortOrder: 4 },
    {
      name: 'Colour Correction',
      price: 35000,
      duration: 240,
      categoryId: catColour.id,
      sortOrder: 5,
      description: 'Consultation required. Price from $350.',
    },
    // Treatments
    {
      name: 'Keratin Smoothing Treatment',
      price: 30000,
      duration: 150,
      categoryId: catTreatments.id,
      sortOrder: 0,
    },
    {
      name: 'Olaplex Treatment',
      price: 5000,
      duration: 30,
      categoryId: catTreatments.id,
      sortOrder: 1,
    },
    {
      name: 'Scalp Treatment',
      price: 4500,
      duration: 30,
      categoryId: catTreatments.id,
      sortOrder: 2,
    },
  ];

  const services = [];
  for (const s of servicesData) {
    const service = await prisma.service.create({
      data: { ...s, salonId: salon.id, isActive: true },
    });
    services.push(service);
  }

  // Assign services to stylists (everyone does cuts, specialists do colour/treatments)
  const cutServices = services.filter((s) => s.categoryId === catCuts.id);
  const colourServices = services.filter((s) => s.categoryId === catColour.id);
  const treatmentServices = services.filter((s) => s.categoryId === catTreatments.id);

  for (const stylist of stylists) {
    // All stylists do cuts
    for (const svc of cutServices) {
      await prisma.stylistService.create({ data: { stylistId: stylist.id, serviceId: svc.id } });
    }
  }
  // Maria, Jade, Sophie do colour
  for (const stylist of [stylists[0], stylists[1], stylists[3]]) {
    for (const svc of colourServices) {
      await prisma.stylistService.create({ data: { stylistId: stylist.id, serviceId: svc.id } });
    }
  }
  // Sophie does treatments
  for (const svc of treatmentServices) {
    await prisma.stylistService.create({ data: { stylistId: stylists[3].id, serviceId: svc.id } });
  }
  // Jade does Olaplex too
  const olaplex = treatmentServices.find((s) => s.name.includes('Olaplex'))!;
  await prisma.stylistService.create({
    data: { stylistId: stylists[1].id, serviceId: olaplex.id },
  });

  // ── Clients ───────────────────────────────────────────────
  const clientsData = [
    {
      name: 'Emma Wilson',
      phone: '0498 111 001',
      email: 'emma.wilson@gmail.com',
      source: 'instagram',
      notes: 'Prefers late appointments. Allergic to PPD.',
    },
    {
      name: 'Olivia Thompson',
      phone: '0498 111 002',
      email: 'olivia.t@outlook.com',
      source: 'referral',
      notes: 'Referred by Emma W. Loves balayage.',
    },
    {
      name: 'Charlotte Davis',
      phone: '0498 111 003',
      email: 'charlotte.d@icloud.com',
      source: 'walk-in',
    },
    {
      name: 'Amelia Brown',
      phone: '0498 111 004',
      email: 'amelia.b@gmail.com',
      source: 'instagram',
      notes: 'Colour correction client. Sensitive scalp.',
    },
    { name: 'Isla Martinez', phone: '0498 111 005', email: 'isla.m@yahoo.com', source: 'google' },
    {
      name: 'Grace Lee',
      phone: '0498 111 006',
      email: 'grace.lee@gmail.com',
      source: 'instagram',
      birthDate: new Date('1994-07-15'),
    },
    {
      name: 'Mia Johnson',
      phone: '0498 111 007',
      email: 'mia.j@gmail.com',
      source: 'referral',
      notes: 'Monthly root touch-up. Chair 2 preferred.',
    },
    { name: 'Zoe Patel', phone: '0498 111 008', source: 'walk-in' },
    {
      name: 'Lily Anderson',
      phone: '0498 111 009',
      email: 'lily.a@outlook.com',
      source: 'google',
      birthDate: new Date('1988-03-22'),
    },
    { name: 'Ruby Garcia', phone: '0498 111 010', email: 'ruby.g@gmail.com', source: 'instagram' },
    {
      name: 'James Taylor',
      phone: '0498 111 011',
      email: 'james.t@gmail.com',
      source: 'walk-in',
      notes: 'Fortnightly cut. Short back and sides fade.',
    },
    {
      name: 'Noah White',
      phone: '0498 111 012',
      source: 'referral',
      hairType: 'wavy',
      hairTexture: 'thick',
      naturalColour: 'black',
    },
    // ── 13 new clients ───────────────────────────────────────
    {
      name: 'Chloe Nguyen',
      phone: '0498 111 013',
      email: 'chloe.n@gmail.com',
      source: 'instagram',
      birthDate: new Date('1996-11-03'),
      notes: 'Loves bold colour changes. Always tips well.',
      hairType: 'straight',
      hairTexture: 'fine',
      naturalColour: 'black',
      productPreferences: 'Olaplex, K18',
    },
    {
      name: 'Sophie Blackwell',
      phone: '0498 111 014',
      email: 'sophie.bw@icloud.com',
      source: 'google',
      birthDate: new Date('1990-04-18'),
      notes: 'Keratin client every 4 months.',
      hairType: 'wavy',
      hairTexture: 'thick',
      naturalColour: 'dark brown',
      productPreferences: 'GKhair keratin',
    },
    {
      name: 'Ava Robinson',
      phone: '0498 111 015',
      email: 'ava.robinson@outlook.com',
      source: 'referral',
      birthDate: new Date('2000-08-25'),
      hairType: 'curly',
      hairTexture: 'medium',
      naturalColour: 'medium brown',
    },
    {
      name: 'Isabella Scott',
      phone: '0498 111 016',
      source: 'walk-in',
      notes: 'Scalp sensitivity — avoid sulphates.',
      allergies: 'Sulphate-based shampoos',
      hairType: 'wavy',
      hairTexture: 'fine',
      naturalColour: 'light brown',
    },
    {
      name: 'Mila Petrov',
      phone: '0498 111 017',
      email: 'mila.p@gmail.com',
      source: 'instagram',
      birthDate: new Date('1998-01-30'),
      notes: 'Balayage regular — every 10 weeks.',
      hairType: 'straight',
      hairTexture: 'medium',
      naturalColour: 'ash blonde',
      productPreferences: 'Redken All Soft',
    },
    {
      name: 'Penelope Hayes',
      phone: '0498 111 018',
      email: 'penelope.h@yahoo.com',
      source: 'google',
      birthDate: new Date('1985-06-12'),
      notes: 'Prefers morning appointments. Brings own reference photos.',
      hairType: 'straight',
      hairTexture: 'thick',
      naturalColour: 'dark blonde',
    },
    {
      name: 'Freya Campbell',
      phone: '0498 111 019',
      email: 'freya.c@gmail.com',
      source: 'referral',
      notes: 'Referred by Lily Anderson. Curly hair specialist needed.',
      hairType: 'curly',
      hairTexture: 'thick',
      naturalColour: 'red',
      allergies: 'PPD',
    },
    {
      name: 'Sienna Morris',
      phone: '0498 111 020',
      email: 'sienna.m@outlook.com',
      source: 'instagram',
      birthDate: new Date('1993-09-07'),
      hairType: 'wavy',
      hairTexture: 'medium',
      naturalColour: 'medium brown',
      productPreferences: 'Moroccanoil',
    },
    {
      name: 'Hannah Kim',
      phone: '0498 111 021',
      email: 'hannah.kim@gmail.com',
      source: 'google',
      birthDate: new Date('2001-02-14'),
      notes: 'Student — prefers weekend slots.',
      hairType: 'straight',
      hairTexture: 'fine',
      naturalColour: 'black',
    },
    {
      name: 'Ella Fitzgerald',
      phone: '0498 111 022',
      email: 'ella.fitz@icloud.com',
      source: 'walk-in',
      birthDate: new Date('1987-12-01'),
      notes: 'Full colour + cut combo every 8 weeks.',
      hairType: 'wavy',
      hairTexture: 'medium',
      naturalColour: 'dark brown',
      productPreferences: 'Wella Professionals',
    },
    {
      name: 'Nora Sullivan',
      phone: '0498 111 023',
      email: 'nora.s@gmail.com',
      source: 'referral',
      notes: 'Referred by Emma Wilson. First-time colour client.',
      hairType: 'straight',
      hairTexture: 'fine',
      naturalColour: 'light brown',
    },
    {
      name: 'Luca Martini',
      phone: '0498 111 024',
      email: 'luca.m@gmail.com',
      source: 'google',
      notes: 'Monthly trim. Prefers Liam.',
      hairType: 'wavy',
      hairTexture: 'medium',
      naturalColour: 'dark brown',
    },
    {
      name: 'Aria Foster',
      phone: '0498 111 025',
      email: 'aria.f@outlook.com',
      source: 'instagram',
      birthDate: new Date('1995-05-20'),
      notes: 'Colour correction history — bleach damage. Patience required.',
      hairType: 'straight',
      hairTexture: 'fine',
      naturalColour: 'dark blonde',
      allergies: 'Ammonia-based dyes',
      productPreferences: 'Olaplex 0-3 home care',
    },
  ];

  const clients = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: { ...c, salonId: salon.id },
    });
    clients.push(client);
  }

  // ── Bookings ──────────────────────────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function setTime(date: Date, hours: number, minutes: number): Date {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // Past bookings — last 60 days (COMPLETED, some CANCELLED/NO_SHOW)
  const pastBookings = [
    // ~60 days ago (Fri)
    { client: 12, stylist: 1, service: 8, day: -60, hour: 9, status: 'COMPLETED' as const },
    { client: 13, stylist: 3, service: 11, day: -60, hour: 10, status: 'COMPLETED' as const },
    { client: 14, stylist: 0, service: 5, day: -60, hour: 14, status: 'COMPLETED' as const },
    // ~55 days ago (Wed)
    { client: 0, stylist: 0, service: 0, day: -55, hour: 9, status: 'COMPLETED' as const },
    { client: 15, stylist: 3, service: 12, day: -55, hour: 11, status: 'COMPLETED' as const },
    { client: 16, stylist: 1, service: 6, day: -55, hour: 14, status: 'COMPLETED' as const },
    // ~49 days ago (Sat — peak)
    { client: 1, stylist: 1, service: 8, day: -49, hour: 9, status: 'COMPLETED' as const },
    { client: 2, stylist: 2, service: 1, day: -49, hour: 10, status: 'COMPLETED' as const },
    { client: 17, stylist: 0, service: 5, day: -49, hour: 11, status: 'COMPLETED' as const },
    { client: 18, stylist: 3, service: 13, day: -49, hour: 13, status: 'COMPLETED' as const },
    { client: 19, stylist: 1, service: 0, day: -49, hour: 14, status: 'COMPLETED' as const },
    // ~48 days ago (Fri)
    { client: 3, stylist: 3, service: 10, day: -48, hour: 9, status: 'COMPLETED' as const },
    { client: 20, stylist: 0, service: 7, day: -48, hour: 11, status: 'COMPLETED' as const },
    { client: 21, stylist: 1, service: 3, day: -48, hour: 15, status: 'COMPLETED' as const },
    // ~42 days ago (Sat)
    { client: 4, stylist: 0, service: 5, day: -42, hour: 9, status: 'COMPLETED' as const },
    { client: 22, stylist: 1, service: 8, day: -42, hour: 10, status: 'COMPLETED' as const },
    { client: 23, stylist: 3, service: 11, day: -42, hour: 13, status: 'COMPLETED' as const },
    { client: 5, stylist: 2, service: 1, day: -42, hour: 14, status: 'COMPLETED' as const },
    // ~41 days ago (Fri)
    { client: 24, stylist: 0, service: 0, day: -41, hour: 10, status: 'COMPLETED' as const },
    { client: 6, stylist: 1, service: 6, day: -41, hour: 14, status: 'CANCELLED' as const },
    // ~35 days ago (Sat)
    { client: 7, stylist: 3, service: 11, day: -35, hour: 9, status: 'COMPLETED' as const },
    { client: 8, stylist: 1, service: 8, day: -35, hour: 10, status: 'COMPLETED' as const },
    { client: 12, stylist: 0, service: 5, day: -35, hour: 13, status: 'COMPLETED' as const },
    { client: 14, stylist: 2, service: 1, day: -35, hour: 14, status: 'COMPLETED' as const },
    // ~34 days ago (Fri)
    { client: 9, stylist: 0, service: 3, day: -34, hour: 9, status: 'COMPLETED' as const },
    { client: 15, stylist: 1, service: 0, day: -34, hour: 11, status: 'NO_SHOW' as const },
    { client: 16, stylist: 3, service: 12, day: -34, hour: 14, status: 'COMPLETED' as const },
    // ~28 days ago (Sat)
    { client: 10, stylist: 2, service: 1, day: -28, hour: 9, status: 'COMPLETED' as const },
    { client: 17, stylist: 0, service: 7, day: -28, hour: 10, status: 'COMPLETED' as const },
    { client: 18, stylist: 1, service: 8, day: -28, hour: 11, status: 'COMPLETED' as const },
    { client: 19, stylist: 3, service: 13, day: -28, hour: 13, status: 'COMPLETED' as const },
    // ~27 days ago (Fri)
    { client: 11, stylist: 2, service: 1, day: -27, hour: 9, status: 'COMPLETED' as const },
    { client: 20, stylist: 0, service: 5, day: -27, hour: 11, status: 'CANCELLED' as const },
    { client: 21, stylist: 1, service: 3, day: -27, hour: 14, status: 'COMPLETED' as const },
    // ~21 days ago (Sat)
    { client: 0, stylist: 0, service: 5, day: -21, hour: 9, status: 'COMPLETED' as const },
    { client: 22, stylist: 1, service: 8, day: -21, hour: 10, status: 'COMPLETED' as const },
    { client: 23, stylist: 3, service: 11, day: -21, hour: 11, status: 'COMPLETED' as const },
    { client: 24, stylist: 2, service: 1, day: -21, hour: 13, status: 'COMPLETED' as const },
    { client: 1, stylist: 0, service: 9, day: -21, hour: 15, status: 'COMPLETED' as const },
    // ~20 days ago (Fri)
    { client: 13, stylist: 1, service: 6, day: -20, hour: 10, status: 'COMPLETED' as const },
    { client: 2, stylist: 3, service: 10, day: -20, hour: 13, status: 'COMPLETED' as const },
    // ~14 days ago (Sat)
    { client: 3, stylist: 0, service: 5, day: -14, hour: 9, status: 'COMPLETED' as const },
    { client: 4, stylist: 1, service: 8, day: -14, hour: 10, status: 'COMPLETED' as const },
    { client: 14, stylist: 3, service: 12, day: -14, hour: 11, status: 'COMPLETED' as const },
    { client: 15, stylist: 2, service: 1, day: -14, hour: 13, status: 'COMPLETED' as const },
    { client: 16, stylist: 0, service: 0, day: -14, hour: 15, status: 'NO_SHOW' as const },
    // ~13 days ago (Fri)
    { client: 5, stylist: 1, service: 0, day: -13, hour: 9, status: 'COMPLETED' as const },
    { client: 6, stylist: 0, service: 5, day: -13, hour: 11, status: 'COMPLETED' as const },
    { client: 17, stylist: 3, service: 13, day: -13, hour: 14, status: 'COMPLETED' as const },
    // ~7 days ago (Sat)
    { client: 7, stylist: 0, service: 5, day: -7, hour: 9, status: 'COMPLETED' as const },
    { client: 8, stylist: 1, service: 8, day: -7, hour: 10, status: 'COMPLETED' as const },
    { client: 18, stylist: 2, service: 1, day: -7, hour: 11, status: 'COMPLETED' as const },
    { client: 19, stylist: 3, service: 11, day: -7, hour: 13, status: 'COMPLETED' as const },
    // ~6 days ago (Fri)
    { client: 9, stylist: 0, service: 3, day: -6, hour: 10, status: 'COMPLETED' as const },
    { client: 20, stylist: 1, service: 6, day: -6, hour: 13, status: 'COMPLETED' as const },
    { client: 21, stylist: 3, service: 12, day: -6, hour: 15, status: 'CANCELLED' as const },
    // earlier this week
    { client: 10, stylist: 2, service: 1, day: -4, hour: 9, status: 'COMPLETED' as const },
    { client: 22, stylist: 0, service: 5, day: -4, hour: 11, status: 'COMPLETED' as const },
    { client: 11, stylist: 2, service: 1, day: -3, hour: 10, status: 'NO_SHOW' as const },
    { client: 23, stylist: 1, service: 0, day: -3, hour: 14, status: 'COMPLETED' as const },
    { client: 24, stylist: 3, service: 13, day: -2, hour: 9, status: 'COMPLETED' as const },
    { client: 12, stylist: 0, service: 5, day: -2, hour: 11, status: 'COMPLETED' as const },
    { client: 9, stylist: 0, service: 3, day: -1, hour: 16, status: 'CANCELLED' as const },
  ];

  // Today's bookings
  const todayBookings = [
    { client: 0, stylist: 0, service: 0, day: 0, hour: 9, status: 'COMPLETED' as const },
    { client: 2, stylist: 2, service: 1, day: 0, hour: 10, status: 'IN_PROGRESS' as const },
    { client: 6, stylist: 1, service: 6, day: 0, hour: 10, status: 'IN_PROGRESS' as const },
    { client: 13, stylist: 3, service: 11, day: 0, hour: 11, status: 'IN_PROGRESS' as const },
    { client: 5, stylist: 0, service: 3, day: 0, hour: 14, status: 'CONFIRMED' as const },
    { client: 8, stylist: 3, service: 12, day: 0, hour: 14, status: 'CONFIRMED' as const },
    { client: 10, stylist: 2, service: 1, day: 0, hour: 15, status: 'CONFIRMED' as const },
  ];

  // Upcoming bookings — next 30 days (peak Fri/Sat, lighter Mon)
  const upcomingBookings = [
    // +1 day
    { client: 1, stylist: 1, service: 8, day: 1, hour: 10, status: 'CONFIRMED' as const },
    { client: 3, stylist: 3, service: 11, day: 1, hour: 11, status: 'CONFIRMED' as const },
    { client: 4, stylist: 0, service: 5, day: 1, hour: 14, status: 'CONFIRMED' as const },
    // +2
    { client: 9, stylist: 0, service: 0, day: 2, hour: 9, status: 'CONFIRMED' as const },
    { client: 7, stylist: 1, service: 3, day: 2, hour: 11, status: 'CONFIRMED' as const },
    { client: 11, stylist: 2, service: 1, day: 2, hour: 14, status: 'CONFIRMED' as const },
    // +3
    { client: 0, stylist: 0, service: 5, day: 3, hour: 10, status: 'PENDING' as const },
    { client: 5, stylist: 3, service: 12, day: 3, hour: 13, status: 'PENDING' as const },
    // +4 (Fri)
    { client: 8, stylist: 1, service: 0, day: 4, hour: 9, status: 'CONFIRMED' as const },
    { client: 14, stylist: 0, service: 7, day: 4, hour: 10, status: 'CONFIRMED' as const },
    { client: 15, stylist: 3, service: 13, day: 4, hour: 13, status: 'CONFIRMED' as const },
    { client: 16, stylist: 1, service: 6, day: 4, hour: 15, status: 'CONFIRMED' as const },
    {
      client: -1,
      stylist: 0,
      service: 0,
      day: 4,
      hour: 14,
      status: 'PENDING' as const,
      guestName: 'Sarah K.',
      guestPhone: '0400 999 111',
    },
    // +5 (Sat — peak)
    { client: 2, stylist: 2, service: 1, day: 5, hour: 9, status: 'CONFIRMED' as const },
    { client: 17, stylist: 0, service: 5, day: 5, hour: 10, status: 'CONFIRMED' as const },
    { client: 18, stylist: 1, service: 8, day: 5, hour: 11, status: 'CONFIRMED' as const },
    { client: 19, stylist: 3, service: 11, day: 5, hour: 13, status: 'PENDING' as const },
    // +7 (Mon — light)
    { client: 20, stylist: 2, service: 1, day: 7, hour: 10, status: 'CONFIRMED' as const },
    // +8
    { client: 21, stylist: 0, service: 0, day: 8, hour: 9, status: 'CONFIRMED' as const },
    { client: 22, stylist: 1, service: 3, day: 8, hour: 11, status: 'CONFIRMED' as const },
    // +11 (Fri)
    { client: 23, stylist: 0, service: 5, day: 11, hour: 10, status: 'CONFIRMED' as const },
    { client: 24, stylist: 1, service: 8, day: 11, hour: 13, status: 'CONFIRMED' as const },
    { client: 12, stylist: 3, service: 12, day: 11, hour: 15, status: 'PENDING' as const },
    // +12 (Sat)
    { client: 0, stylist: 0, service: 7, day: 12, hour: 9, status: 'CONFIRMED' as const },
    { client: 1, stylist: 1, service: 8, day: 12, hour: 10, status: 'CONFIRMED' as const },
    { client: 13, stylist: 2, service: 1, day: 12, hour: 11, status: 'CONFIRMED' as const },
    { client: 3, stylist: 3, service: 11, day: 12, hour: 14, status: 'PENDING' as const },
    // +14 (Mon)
    { client: 6, stylist: 2, service: 1, day: 14, hour: 11, status: 'CONFIRMED' as const },
    // +18 (Fri)
    { client: 4, stylist: 0, service: 5, day: 18, hour: 10, status: 'CONFIRMED' as const },
    { client: 7, stylist: 1, service: 6, day: 18, hour: 13, status: 'CONFIRMED' as const },
    { client: 14, stylist: 3, service: 13, day: 18, hour: 15, status: 'PENDING' as const },
    // +19 (Sat)
    { client: 15, stylist: 0, service: 0, day: 19, hour: 9, status: 'CONFIRMED' as const },
    { client: 16, stylist: 1, service: 8, day: 19, hour: 10, status: 'CONFIRMED' as const },
    { client: 17, stylist: 3, service: 11, day: 19, hour: 11, status: 'PENDING' as const },
    // +25 (Fri)
    { client: 18, stylist: 0, service: 5, day: 25, hour: 10, status: 'PENDING' as const },
    { client: 19, stylist: 1, service: 3, day: 25, hour: 13, status: 'PENDING' as const },
    // +26 (Sat)
    { client: 20, stylist: 2, service: 1, day: 26, hour: 9, status: 'PENDING' as const },
    { client: 21, stylist: 0, service: 7, day: 26, hour: 11, status: 'PENDING' as const },
    { client: 22, stylist: 1, service: 8, day: 26, hour: 14, status: 'PENDING' as const },
    // +28 (Mon — light)
    { client: 23, stylist: 3, service: 12, day: 28, hour: 11, status: 'PENDING' as const },
  ];

  const allBookings = [...pastBookings, ...todayBookings, ...upcomingBookings];

  for (const b of allBookings) {
    const svc = services[b.service];
    const startTime = setTime(addDays(today, b.day), b.hour, 0);
    const endTime = new Date(startTime.getTime() + svc.duration * 60 * 1000);

    await prisma.booking.create({
      data: {
        startTime,
        endTime,
        status: b.status,
        price: svc.price,
        clientId: b.client >= 0 ? clients[b.client].id : null,
        guestName: 'guestName' in b ? b.guestName : null,
        guestPhone: 'guestPhone' in b ? b.guestPhone : null,
        serviceId: svc.id,
        stylistId: stylists[b.stylist].id,
        salonId: salon.id,
        cancelledAt: b.status === 'CANCELLED' ? new Date() : null,
        cancelReason: b.status === 'CANCELLED' ? 'Client requested reschedule' : null,
      },
    });
  }

  // ── Recurring Bookings ──────────────────────────────────────
  const recurringData = [
    // weekly
    {
      client: 10,
      stylist: 2,
      service: 1,
      intervalWeeks: 1,
      dayOfWeek: 2,
      time: '10:00',
      nextDays: 7,
    },
    {
      client: 6,
      stylist: 0,
      service: 5,
      intervalWeeks: 1,
      dayOfWeek: 4,
      time: '11:00',
      nextDays: 4,
    },
    {
      client: 5,
      stylist: 1,
      service: 0,
      intervalWeeks: 1,
      dayOfWeek: 3,
      time: '09:00',
      nextDays: 10,
    },
    {
      client: 19,
      stylist: 3,
      service: 12,
      intervalWeeks: 1,
      dayOfWeek: 5,
      time: '14:00',
      nextDays: 5,
    },
    // fortnightly
    {
      client: 11,
      stylist: 2,
      service: 1,
      intervalWeeks: 2,
      dayOfWeek: 2,
      time: '11:00',
      nextDays: 8,
    },
    {
      client: 16,
      stylist: 1,
      service: 6,
      intervalWeeks: 2,
      dayOfWeek: 4,
      time: '15:00',
      nextDays: 11,
    },
    {
      client: 22,
      stylist: 0,
      service: 7,
      intervalWeeks: 2,
      dayOfWeek: 6,
      time: '10:00',
      nextDays: 12,
    },
    {
      client: 23,
      stylist: 1,
      service: 8,
      intervalWeeks: 2,
      dayOfWeek: 5,
      time: '09:00',
      nextDays: 18,
    },
  ];

  for (const r of recurringData) {
    await prisma.recurringBooking.create({
      data: {
        intervalWeeks: r.intervalWeeks,
        dayOfWeek: r.dayOfWeek,
        preferredTime: r.time,
        isActive: true,
        nextRunDate: addDays(today, r.nextDays),
        clientId: clients[r.client].id,
        serviceId: services[r.service].id,
        stylistId: stylists[r.stylist].id,
        salonId: salon.id,
      },
    });
  }

  // ── Waitlist Entries ─────────────────────────────────────────
  const waitlistData = [
    {
      client: 14,
      service: 8,
      stylist: 1,
      status: 'WAITING' as const,
      prefStart: addDays(today, 3),
      prefEnd: addDays(today, 14),
      prefTimeStart: '09:00',
      prefTimeEnd: '13:00',
      expiresAt: addDays(today, 14),
    },
    {
      client: 20,
      service: 5,
      stylist: 0,
      status: 'WAITING' as const,
      prefStart: addDays(today, 1),
      prefEnd: addDays(today, 10),
      prefTimeStart: '10:00',
      prefTimeEnd: '17:00',
      expiresAt: addDays(today, 10),
    },
    {
      client: 24,
      service: 10,
      stylist: null,
      status: 'NOTIFIED' as const,
      prefStart: addDays(today, 1),
      prefEnd: addDays(today, 7),
      prefTimeStart: '09:00',
      prefTimeEnd: '12:00',
      notifiedAt: addDays(today, -1),
      expiresAt: addDays(today, 7),
    },
    {
      client: 18,
      service: 11,
      stylist: 3,
      status: 'NOTIFIED' as const,
      prefStart: addDays(today, 2),
      prefEnd: addDays(today, 9),
      prefTimeStart: null,
      prefTimeEnd: null,
      notifiedAt: addDays(today, -2),
      expiresAt: addDays(today, 9),
    },
    {
      client: 9,
      service: 7,
      stylist: null,
      status: 'EXPIRED' as const,
      prefStart: addDays(today, -14),
      prefEnd: addDays(today, -7),
      prefTimeStart: '14:00',
      prefTimeEnd: '18:00',
      expiresAt: addDays(today, -7),
    },
    {
      client: 3,
      service: 8,
      stylist: 1,
      status: 'EXPIRED' as const,
      prefStart: addDays(today, -21),
      prefEnd: addDays(today, -14),
      prefTimeStart: '09:00',
      prefTimeEnd: '17:00',
      expiresAt: addDays(today, -14),
    },
  ];

  for (const w of waitlistData) {
    await prisma.waitlistEntry.create({
      data: {
        status: w.status,
        preferredDateStart: w.prefStart,
        preferredDateEnd: w.prefEnd,
        preferredTimeStart: w.prefTimeStart ?? null,
        preferredTimeEnd: w.prefTimeEnd ?? null,
        notifiedAt: 'notifiedAt' in w ? w.notifiedAt : null,
        expiresAt: w.expiresAt,
        clientId: clients[w.client].id,
        serviceId: services[w.service].id,
        stylistId: w.stylist !== null ? stylists[w.stylist].id : null,
        salonId: salon.id,
      },
    });
  }

  // ── SMS Logs ─────────────────────────────────────────────────
  // Collect the created bookings so we can tie SMS to them
  const createdBookings = await prisma.booking.findMany({
    where: { salonId: salon.id },
    orderBy: { startTime: 'asc' },
    take: 30,
  });

  const smsOutbound = [
    // outbound reminders tied to past bookings
    {
      daysAgo: 29,
      clientIdx: 12,
      msg: 'Hi Chloe, reminder for your appt tomorrow at 9:00am with Jade. Reply YES to confirm or call us to reschedule.',
      bookingIdx: 0,
    },
    {
      daysAgo: 27,
      clientIdx: 13,
      msg: 'Hi Sophie, reminder for your appointment tomorrow at 10:00am with Sophie Chen. See you then! 💇',
      bookingIdx: 1,
    },
    {
      daysAgo: 26,
      clientIdx: 0,
      msg: 'Hi Emma, just a reminder you have a booking tomorrow at 9:00am with Maria. Reply YES to confirm.',
      bookingIdx: 2,
    },
    {
      daysAgo: 20,
      clientIdx: 4,
      msg: 'Hi Isla, reminder for your Full Colour appointment tomorrow at 11:00am with Maria. Reply YES to confirm.',
      bookingIdx: 3,
    },
    {
      daysAgo: 19,
      clientIdx: 16,
      msg: 'Hi Mila, your Half Head Foils appt is tomorrow at 2:00pm with Jade. Reply YES to confirm or call to reschedule.',
      bookingIdx: 4,
    },
    {
      daysAgo: 13,
      clientIdx: 3,
      msg: "Hi Amelia, reminder for tomorrow's Colour Correction at 9:00am with Sophie. See you soon!",
      bookingIdx: 5,
    },
    {
      daysAgo: 12,
      clientIdx: 17,
      msg: 'Hi Penelope, just a reminder you have Balayage tomorrow at 11:00am with Maria. Reply YES to confirm.',
      bookingIdx: 6,
    },
    {
      daysAgo: 6,
      clientIdx: 7,
      msg: 'Hi Zoe, reminder for your Keratin Treatment tomorrow at 9:00am with Sophie. Reply YES to confirm.',
      bookingIdx: 7,
    },
    {
      daysAgo: 5,
      clientIdx: 8,
      msg: 'Hi Lily, your Balayage is tomorrow at 10:00am with Jade. Looking forward to seeing you!',
      bookingIdx: 8,
    },
    {
      daysAgo: 4,
      clientIdx: 18,
      msg: 'Hi Sienna, reminder for your Scalp Treatment tomorrow at 1:00pm with Sophie. Reply YES to confirm.',
      bookingIdx: 9,
    },
    {
      daysAgo: 3,
      clientIdx: 19,
      msg: 'Hi Hannah, just a quick reminder — appointment tomorrow at 3:00pm with Sophie. Reply YES to confirm.',
      bookingIdx: 10,
    },
    {
      daysAgo: 2,
      clientIdx: 10,
      msg: "Hi Ella, reminder for tomorrow's Women's Cut & Blow Dry at 11:00am with Liam. See you soon!",
      bookingIdx: 11,
    },
    {
      daysAgo: 2,
      clientIdx: 22,
      msg: 'Hi Nora, Maria is looking forward to seeing you tomorrow at 11:00am for your Full Colour. Reply YES to confirm.',
      bookingIdx: 12,
    },
    {
      daysAgo: 1,
      clientIdx: 24,
      msg: 'Hi Aria, reminder for your Scalp Treatment today at 9:00am with Sophie. See you shortly!',
      bookingIdx: 13,
    },
    {
      daysAgo: 1,
      clientIdx: 12,
      msg: 'Hi Chloe, reminder: Full Colour today at 11:00am with Maria. Looking forward to it!',
      bookingIdx: 14,
    },
    // upcoming reminders (sent yesterday/today for tomorrow appts)
    {
      daysAgo: 0,
      clientIdx: 1,
      msg: 'Hi Olivia, reminder for your Balayage tomorrow at 10:00am with Jade. Reply YES to confirm.',
      bookingIdx: 15,
    },
    {
      daysAgo: 0,
      clientIdx: 3,
      msg: 'Hi Amelia, reminder for your Keratin Treatment tomorrow at 11:00am with Sophie. Reply YES to confirm.',
      bookingIdx: 16,
    },
    {
      daysAgo: 0,
      clientIdx: 4,
      msg: 'Hi Isla, your Full Colour is tomorrow at 2:00pm with Maria. Looking forward to seeing you!',
      bookingIdx: 17,
    },
    // delivery confirmations (treated as additional outbound status records)
    {
      daysAgo: 29,
      clientIdx: 12,
      msg: '[Delivered] Reminder sent to Chloe Nguyen.',
      bookingIdx: 0,
      status: 'delivered',
    },
    {
      daysAgo: 20,
      clientIdx: 4,
      msg: '[Delivered] Reminder sent to Isla Martinez.',
      bookingIdx: 3,
      status: 'delivered',
    },
    {
      daysAgo: 6,
      clientIdx: 7,
      msg: '[Delivered] Reminder sent to Zoe Patel.',
      bookingIdx: 7,
      status: 'delivered',
    },
  ];

  const smsInbound = [
    { daysAgo: 28, clientIdx: 12, msg: 'YES confirmed thanks!', bookingIdx: 0 },
    { daysAgo: 19, clientIdx: 16, msg: 'Yes confirmed', bookingIdx: 4 },
    { daysAgo: 11, clientIdx: 17, msg: 'Yes see you then', bookingIdx: 6 },
    { daysAgo: 4, clientIdx: 7, msg: 'Need to reschedule sorry', bookingIdx: 7 },
    { daysAgo: 3, clientIdx: 19, msg: 'Yes confirmed 👍', bookingIdx: 10 },
    { daysAgo: 1, clientIdx: 24, msg: 'Yes will be there', bookingIdx: 13 },
    { daysAgo: 0, clientIdx: 1, msg: 'Yes confirmed', bookingIdx: 15 },
    { daysAgo: 0, clientIdx: 3, msg: 'Can we move to 12pm instead?', bookingIdx: 16 },
  ];

  for (const s of smsOutbound) {
    const createdAt = new Date(Date.now() - s.daysAgo * 86400000);
    await prisma.smsLog.create({
      data: {
        direction: 'OUTBOUND',
        phone: clients[s.clientIdx].phone ?? '0400000000',
        body: s.msg,
        status: s.status ?? 'sent',
        twilioSid: `SM${Math.random().toString(36).slice(2, 34).toUpperCase()}`,
        clientId: clients[s.clientIdx].id,
        bookingId: createdBookings[s.bookingIdx]?.id ?? null,
        salonId: salon.id,
        createdAt,
      },
    });
  }

  for (const s of smsInbound) {
    const createdAt = new Date(Date.now() - s.daysAgo * 86400000 + 3600000);
    await prisma.smsLog.create({
      data: {
        direction: 'INBOUND',
        phone: clients[s.clientIdx].phone ?? '0400000000',
        body: s.msg,
        status: 'received',
        clientId: clients[s.clientIdx].id,
        bookingId: createdBookings[s.bookingIdx]?.id ?? null,
        salonId: salon.id,
        createdAt,
      },
    });
  }

  const counts = {
    stylists: stylists.length,
    services: services.length,
    clients: clients.length,
    bookings: allBookings.length,
  };

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('| Entity    | Count |');
  console.log('|-----------|-------|');
  console.log(`| Stylists  | ${counts.stylists}     |`);
  console.log(`| Services  | ${counts.services}    |`);
  console.log(`| Clients   | ${counts.clients}    |`);
  console.log(`| Bookings  | ${counts.bookings}    |`);
  console.log('');
  console.log('🔑 Login: demo@openchair.dev / demo1234');
  console.log(`🔗 Public booking: http://localhost:3000/book/${salon.slug}`);
  console.log('');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
