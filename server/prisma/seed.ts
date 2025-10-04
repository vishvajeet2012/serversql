import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding existing feedback with creator info...');

  const feedbacks = await prisma.feedback.findMany({
    where: {
      created_by: undefined, 
    },
    include: {
      teacher_profile: true,
    },
  });

  for (const feedback of feedbacks) {
    await prisma.feedback.update({
      where: { feedback_id: feedback.feedback_id },
      data: {
        created_by: feedback.teacher_id,
        sender_role: 'Teacher',
      },
    });
  }

  console.log(`✅ Updated ${feedbacks.length} existing feedback records`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
