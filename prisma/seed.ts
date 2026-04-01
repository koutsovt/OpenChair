/* eslint-disable no-console */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { createClient } from '@supabase/supabase-js';

const DATABASE_URL = process.env.DATABASE_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const adapter = new PrismaPg(DATABASE_URL);
const prisma = new PrismaClient({ adapter });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  await prisma.user.deleteMany();

  // Delete all Supabase auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  for (const u of authUsers?.users ?? []) {
    await supabase.auth.admin.deleteUser(u.id);
  }

  // Create demo Supabase auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: 'demo@openchair.dev',
    password: 'demo1234',
    email_confirm: true,
    user_metadata: { first_name: 'Maria', last_name: 'Kotsifas' },
  });
  if (authErr) throw authErr;

  // Create Prisma user
  const owner = await prisma.user.create({
    data: {
      email: 'demo@openchair.dev',
      supabaseId: authData.user.id,
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
    { name: 'Noah White', phone: '0498 111 012', source: 'referral' },
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

  // Past bookings (completed)
  const pastBookings = [
    { client: 0, stylist: 0, service: 0, day: -7, hour: 9, status: 'COMPLETED' as const },
    { client: 1, stylist: 1, service: 8, day: -7, hour: 10, status: 'COMPLETED' as const },
    { client: 2, stylist: 2, service: 1, day: -6, hour: 14, status: 'COMPLETED' as const },
    { client: 3, stylist: 3, service: 10, day: -5, hour: 9, status: 'COMPLETED' as const },
    { client: 4, stylist: 0, service: 5, day: -4, hour: 11, status: 'COMPLETED' as const },
    { client: 5, stylist: 1, service: 0, day: -3, hour: 15, status: 'COMPLETED' as const },
    { client: 6, stylist: 0, service: 5, day: -2, hour: 10, status: 'COMPLETED' as const },
    { client: 10, stylist: 2, service: 1, day: -2, hour: 11, status: 'COMPLETED' as const },
    { client: 7, stylist: 3, service: 11, day: -1, hour: 9, status: 'COMPLETED' as const },
    { client: 8, stylist: 1, service: 8, day: -1, hour: 13, status: 'COMPLETED' as const },
    // One no-show and one cancellation
    { client: 11, stylist: 2, service: 1, day: -3, hour: 10, status: 'NO_SHOW' as const },
    { client: 9, stylist: 0, service: 3, day: -1, hour: 16, status: 'CANCELLED' as const },
  ];

  // Today's bookings
  const todayBookings = [
    { client: 0, stylist: 0, service: 0, day: 0, hour: 9, status: 'COMPLETED' as const },
    { client: 2, stylist: 2, service: 1, day: 0, hour: 10, status: 'IN_PROGRESS' as const },
    { client: 6, stylist: 1, service: 6, day: 0, hour: 10, status: 'IN_PROGRESS' as const },
    { client: 5, stylist: 0, service: 3, day: 0, hour: 14, status: 'CONFIRMED' as const },
    { client: 8, stylist: 3, service: 12, day: 0, hour: 14, status: 'CONFIRMED' as const },
    { client: 10, stylist: 2, service: 1, day: 0, hour: 15, status: 'CONFIRMED' as const },
  ];

  // Upcoming bookings
  const upcomingBookings = [
    { client: 1, stylist: 1, service: 8, day: 1, hour: 10, status: 'CONFIRMED' as const },
    { client: 3, stylist: 3, service: 11, day: 1, hour: 11, status: 'CONFIRMED' as const },
    { client: 4, stylist: 0, service: 5, day: 1, hour: 14, status: 'CONFIRMED' as const },
    { client: 9, stylist: 0, service: 0, day: 2, hour: 9, status: 'CONFIRMED' as const },
    { client: 7, stylist: 1, service: 3, day: 2, hour: 11, status: 'CONFIRMED' as const },
    { client: 11, stylist: 2, service: 1, day: 2, hour: 14, status: 'CONFIRMED' as const },
    { client: 0, stylist: 0, service: 5, day: 3, hour: 10, status: 'PENDING' as const },
    { client: 5, stylist: 3, service: 12, day: 3, hour: 13, status: 'PENDING' as const },
    { client: 8, stylist: 1, service: 0, day: 4, hour: 9, status: 'CONFIRMED' as const },
    { client: 2, stylist: 2, service: 1, day: 5, hour: 15, status: 'CONFIRMED' as const },
    // Guest booking (no client)
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
