import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { USER_ROLE, EVENT_STATUS, SKILL_LEVEL, TICKET_TYPE, VISIBILITY } from '@jamming/shared';

const prisma = new PrismaClient();

async function main() {
  // Production safety: Never run seeds in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed script refused: NODE_ENV is production. Seeds are for development only.');
    process.exit(1);
  }

  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jamming.events' },
    update: {},
    create: {
      email: 'admin@jamming.events',
      displayName: 'Admin',
      passwordHash: adminPassword,
      role: USER_ROLE.ADMIN,
      emailVerified: true,
      bio: 'Platform administrator',
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // Create demo organizer
  const organizerPassword = await hash('organizer123', 12);
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@jamming.events' },
    update: {},
    create: {
      email: 'organizer@jamming.events',
      displayName: 'Jam Master',
      passwordHash: organizerPassword,
      role: USER_ROLE.ORGANIZER,
      emailVerified: true,
      bio: 'Professional session organizer',
      instruments: JSON.stringify(['guitar', 'vocals']),
      skillLevel: SKILL_LEVEL.ADVANCED,
    },
  });
  console.log(`  ✓ Organizer: ${organizer.email}`);

  // Create demo attendee
  const attendeePassword = await hash('attendee123', 12);
  const attendee = await prisma.user.upsert({
    where: { email: 'attendee@jamming.events' },
    update: {},
    create: {
      email: 'attendee@jamming.events',
      displayName: 'Jam Fan',
      passwordHash: attendeePassword,
      role: USER_ROLE.USER,
      emailVerified: true,
      instruments: JSON.stringify(['drums']),
      skillLevel: SKILL_LEVEL.INTERMEDIATE,
    },
  });
  console.log(`  ✓ Attendee: ${attendee.email}`);

  // Create demo event
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { slug: 'austin-blues-night' },
    update: {},
    create: {
      title: 'Austin Blues Night',
      slug: 'austin-blues-night',
      description:
        'A night of blues, soul, and improvisation. Bring your instrument and your best licks. All skill levels welcome.',
      startDate: nextWeek,
      startTime: '19:00',
      endDate: nextWeek,
      endTime: '23:00',
      venueName: 'The Continental Club',
      venueAddress: '1315 S Congress Ave, Austin, TX 78704',
      venueLat: 30.2503,
      venueLng: -97.7491,
      capacity: 50,
      ticketType: TICKET_TYPE.FREE,
      instruments: JSON.stringify(['guitar', 'bass', 'drums', 'keys', 'vocals', 'horns']),
      skillLevel: SKILL_LEVEL.ALL,
      visibility: VISIBILITY.PUBLIC,
      status: EVENT_STATUS.PUBLISHED,
      organizerId: organizer.id,
    },
  });
  console.log(`  ✓ Event: ${event.title}`);

  console.log('✅ Seeding complete!');
  console.log('\n📋 Demo accounts:');
  console.log('  Admin:     admin@jamming.events / admin123');
  console.log('  Organizer: organizer@jamming.events / organizer123');
  console.log('  Attendee:  attendee@jamming.events / attendee123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
