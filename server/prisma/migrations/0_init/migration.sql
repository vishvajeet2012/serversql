-- CreateTable
CREATE TABLE "audit_log" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "class" (
    "class_id" SERIAL NOT NULL,
    "class_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_pkey" PRIMARY KEY ("class_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "feedback_id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "marks" (
    "marks_id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "marks_obtained" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PendingApproval',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marks_pkey" PRIMARY KEY ("marks_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "section" (
    "section_id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "section_name" VARCHAR(50) NOT NULL,
    "class_teacher_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_pkey" PRIMARY KEY ("section_id")
);

-- CreateTable
CREATE TABLE "section_teachers" (
    "id" SERIAL NOT NULL,
    "section_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profile" (
    "student_id" INTEGER NOT NULL,
    "roll_number" VARCHAR(20) NOT NULL,
    "class_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "dob" DATE,
    "guardian_name" VARCHAR(100),
    "guardian_mobile_number" VARCHAR(15),
    "student_mobile_number" VARCHAR(15),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profile_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "subject" (
    "subject_id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "subject_name" VARCHAR(100) NOT NULL,
    "subject_teacher_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "teacher_profile" (
    "teacher_id" INTEGER NOT NULL,
    "assigned_subjects" JSONB,
    "class_assignments" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_profile_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "test" (
    "test_id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "test_name" VARCHAR(150) NOT NULL,
    "date_conducted" DATE NOT NULL,
    "max_marks" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "test_rank" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mobile_number" VARCHAR(20),
    "profile_picture" TEXT,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'Student',
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "push_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "section_class_teacher_id_key" ON "section"("class_teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_teachers_section_id_teacher_id_key" ON "section_teachers"("section_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_mobile" ON "users"("mobile_number");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profile"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profile"("teacher_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test"("test_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marks" ADD CONSTRAINT "marks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profile"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marks" ADD CONSTRAINT "marks_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test"("test_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "section_teachers" ADD CONSTRAINT "section_teachers_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("section_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "section_teachers" ADD CONSTRAINT "section_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profile"("teacher_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("section_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_profile" ADD CONSTRAINT "teacher_profile_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("class_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "teacher_profile"("teacher_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("section_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("subject_id") ON DELETE CASCADE ON UPDATE NO ACTION;

