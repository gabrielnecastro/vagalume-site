-- =============================================================================
-- Vagalume QA Playground — seed data (PostgreSQL)
--
-- The same demo data the old SQLite version inserted on first run.
-- Runs automatically right after 01-schema.sql on an empty volume.
-- =============================================================================

-- companies
INSERT INTO companies (id, name, sector, city, logo, description) VALUES
  (1, 'Nimbus Tech', 'Technology', 'São Paulo, SP', '/img/logos/nimbus.jpg', 'B2B software startup focused on automating financial processes.'),
  (2, 'Grain Foods', 'Food Retail', 'Belo Horizonte, MG', '/img/logos/grao.jpg', 'Regional supermarket chain with more than 40 stores in Minas Gerais.'),
  (3, 'Vector Financial', 'Finance', 'Remote', '/img/logos/vetor.jpg', 'Fintech providing credit for small and medium businesses.'),
  (4, 'Root Consulting', 'Consulting', 'Belo Horizonte, MG', '/img/logos/raiz.jpg', 'Management consulting for growing companies.'),
  (5, 'Pixel Studio', 'Design & Marketing', 'Remote', '/img/logos/pixel.jpg', 'Digital design studio and performance marketing agency.'),
  (6, 'Trail Logistics', 'Logistics', 'Curitiba, PR', '/img/logos/trilha.jpg', 'Logistics operator focused on regional distribution.'),
  (7, 'Horizon Health', 'Healthcare', 'Rio de Janeiro, RJ', '/img/logos/horizonte.jpg', 'Network of multi-specialty medical clinics.'),
  (8, 'Compass Education', 'Education', 'Remote', '/img/logos/bussola.jpg', 'Online language learning platform.'),
  (9, 'Summit Builders', 'Construction', 'Belo Horizonte, MG', '/img/logos/cume.jpg', 'Residential and commercial builder with 15 years in the market.'),
  (10, 'Arctic Games', 'Gaming & Technology', 'São Paulo, SP', '/img/logos/artico.jpg', 'Independent mobile game studio.');

-- jobs
INSERT INTO jobs (id, "companyId", title, area, seniority, "contractType", "workModel", city, salary, status, description, requirements) VALUES
  (1, 1, 'Backend Node.js Developer', 'Technology', 'Mid-level', 'Full-time', 'Remote', 'São Paulo, SP', 'R$ 7,000 - R$ 9,500', 'open', 'You''ll work on the platform team, building APIs and integrations with banks and ERPs.', 'Node.js, Express, PostgreSQL, automated testing.'),
  (2, 1, 'QA Automation Analyst', 'Technology', 'Junior', 'Full-time', 'Hybrid', 'São Paulo, SP', 'R$ 4,200 - R$ 5,500', 'open', 'Responsible for creating and maintaining automated end-to-end and API tests.', 'Cypress or Playwright, familiarity with CI/CD, intermediate English.'),
  (3, 2, 'Procurement Analyst', 'Procurement', 'Mid-level', 'Full-time', 'On-site', 'Belo Horizonte, MG', 'R$ 4,500 - R$ 5,800', 'open', 'Supplier negotiation and inventory management across more than 40 stores.', 'Advanced Excel, retail experience, driver''s license (CNH B).'),
  (4, 2, 'Logistics Assistant', 'Operations', 'Junior', 'Full-time', 'On-site', 'Belo Horizonte, MG', 'R$ 2,200 - R$ 2,600', 'closed', 'Support with receiving and checking merchandise at the distribution center.', 'High school diploma, flexible schedule.'),
  (5, 3, 'Senior Financial Analyst', 'Finance', 'Senior', 'Full-time', 'Remote', 'Remote', 'R$ 9,000 - R$ 12,000', 'open', 'Credit risk modeling and portfolio indicator tracking.', 'Excel/VBA, fintech experience, Python is a plus.'),
  (6, 3, 'Accounting Intern', 'Finance', 'Intern', 'Internship', 'Hybrid', 'São Paulo, SP', 'Stipend R$ 1,800', 'open', 'Support with monthly accounting close and bank reconciliations.', 'Currently pursuing a degree in Accounting or Economics.'),
  (7, 4, 'Mid-level Business Consultant', 'Consulting', 'Mid-level', 'Contractor', 'Hybrid', 'Belo Horizonte, MG', 'R$ 8,000 - R$ 10,000', 'open', 'Process diagnostics and improvement implementation for client companies.', 'Consulting experience, availability for travel.'),
  (8, 4, 'HR Analyst', 'Human Resources', 'Junior', 'Full-time', 'On-site', 'Belo Horizonte, MG', 'R$ 3,500 - R$ 4,200', 'open', 'Recruiting, selection, and support with personnel department routines.', 'Degree in HR, Psychology, or Business Administration.'),
  (9, 5, 'Mid-level UX/UI Designer', 'Design', 'Mid-level', 'Contractor', 'Remote', 'Remote', 'R$ 6,500 - R$ 8,500', 'open', 'Digital product design for e-commerce and fintech clients.', 'Figma, portfolio, experience with design systems.'),
  (10, 5, 'Junior Social Media', 'Marketing', 'Junior', 'Full-time', 'Remote', 'Remote', 'R$ 2,800 - R$ 3,400', 'open', 'Content creation and social media management for the studio''s clients.', 'Copywriting, basic video editing, creativity.'),
  (11, 6, 'Logistics Coordinator', 'Logistics', 'Mid-level', 'Full-time', 'On-site', 'Curitiba, PR', 'R$ 6,000 - R$ 7,500', 'open', 'Management of the routing team and delivery indicators.', 'Experience at carriers/freight companies, team leadership.'),
  (12, 6, 'Delivery Driver', 'Operations', 'Junior', 'Full-time', 'On-site', 'Curitiba, PR', 'R$ 2,400 + travel allowance', 'open', 'Deliveries in the Curitiba metropolitan area, fixed route.', 'Driver''s license (CNH B), availability for external routes.'),
  (13, 7, 'Shift Nurse', 'Healthcare', 'Mid-level', 'Full-time', 'On-site', 'Rio de Janeiro, RJ', 'R$ 5,200 - R$ 6,000', 'open', '12x36 shifts at an urgent care clinic.', 'Active nursing license (COREN), experience in urgent/emergency care.'),
  (14, 7, 'Clinic Receptionist', 'Customer Service', 'Junior', 'Full-time', 'On-site', 'Rio de Janeiro, RJ', 'R$ 2,100 - R$ 2,500', 'closed', 'Patient reception, appointment scheduling, and administrative support.', 'High school diploma, good communication skills.'),
  (15, 8, 'Online English Teacher', 'Education', 'Mid-level', 'Contractor', 'Remote', 'Remote', 'R$ 45 - R$ 60 / class hour', 'open', 'Private and group classes through the platform, adult students.', 'English fluency, teaching certification is a plus.'),
  (16, 8, 'Pedagogical Coordinator', 'Education', 'Senior', 'Full-time', 'Hybrid', 'Remote', 'R$ 7,500 - R$ 9,000', 'open', 'Curriculum design and class quality monitoring.', 'Degree in Language/Literature, experience in pedagogical coordination.'),
  (17, 9, 'Mid-level Civil Engineer', 'Engineering', 'Mid-level', 'Full-time', 'On-site', 'Belo Horizonte, MG', 'R$ 8,500 - R$ 10,500', 'open', 'Overseeing residential construction projects from budget to delivery.', 'Active engineering license (CREA), experience with AutoCAD and cost/schedule tracking.'),
  (18, 9, 'Construction Foreman', 'Engineering', 'Senior', 'Full-time', 'On-site', 'Belo Horizonte, MG', 'R$ 5,500 - R$ 6,800', 'open', 'Managing the construction site and outsourced crews.', 'Minimum 8 years of experience in residential construction.'),
  (19, 10, 'Unity Game Developer', 'Technology', 'Mid-level', 'Full-time', 'Remote', 'São Paulo, SP', 'R$ 6,800 - R$ 8,800', 'open', 'Developing gameplay mechanics for casual mobile games.', 'C#, Unity, portfolio of published games.'),
  (20, 10, 'Junior Game Designer', 'Design', 'Junior', 'Contractor', 'Remote', 'Remote', 'R$ 3,500 - R$ 4,500', 'open', 'Level prototyping and game economy balancing.', 'Portfolio of projects (academic work is fine), passion for mobile games.');

-- users
INSERT INTO users (id, name, email, password, role, city, "companyId", "resumeUrl") VALUES
  (1, 'John Doe', 'candidato@vagalume.test', 'demo123', 'candidate', 'Belo Horizonte, MG', NULL, NULL),
  (2, 'Fernanda Duarte', 'fernanda@example.com', 'pass123', 'candidate', 'São Paulo, SP', NULL, NULL),
  (3, 'Ricardo Nogueira', 'ricardo@example.com', 'pass123', 'candidate', 'Curitiba, PR', NULL, NULL),
  (4, 'Nimbus Tech HR', 'empresa@vagalume.test', 'demo123', 'employer', NULL, 1, NULL),
  (5, 'Arctic Games HR', 'empresa2@vagalume.test', 'demo123', 'employer', NULL, 10, NULL);

-- experiences
INSERT INTO experiences (id, "userId", company, role, "startDate", "endDate", description) VALUES
  (1, 1, 'Beta Studio', 'QA Analyst', '2022-01', '2024-03', 'Regression test automation with Cypress and Postman.'),
  (2, 1, 'Easy Commerce', 'IT Intern', '2020-06', '2021-12', 'Technical support and manual testing of a sales system.');

-- preferences
INSERT INTO preferences ("userId", area, seniority, "workModel", "minSalary", availability) VALUES
  (1, 'Technology', 'Mid-level', 'Remote', 5000, 'immediate');

-- applications
INSERT INTO applications (id, "jobId", "userId", status, "appliedAt") VALUES
  (1, 2, 1, 'in_review', '2026-09-02T10:00:00.000Z'),
  (2, 1, 1, 'interview', '2026-09-05T14:30:00.000Z'),
  (3, 9, 1, 'received', '2026-09-10T09:15:00.000Z'),
  (4, 2, 2, 'received', '2026-09-11T11:00:00.000Z'),
  (5, 1, 3, 'rejected', '2026-08-20T16:00:00.000Z');

-- reviews
-- each review belongs to a candidate account (D-05, 10/17/2026)
INSERT INTO reviews (id, "jobId", "companyId", "authorId", author, rating, comment, "wasEmployee", "createdAt") VALUES
  (1, 1, 1, 3, 'Ricardo Nogueira', 4, 'Very good technical team, but tight deadlines during closing periods.', TRUE, '2026-06-01T00:00:00.000Z'),
  (2, 2, 1, 2, 'Fernanda Duarte', 5, 'Fast and transparent hiring process, quick feedback.', FALSE, '2026-07-15T00:00:00.000Z'),
  (3, 9, 5, 3, 'Ricardo Nogueira', 3, 'Creative environment, but workload varies a lot by client.', TRUE, '2026-05-20T00:00:00.000Z');

-- followed_companies
INSERT INTO followed_companies ("userId", "companyId") VALUES
  (1, 1),
  (1, 5);

-- courses
INSERT INTO courses (id, title, instructor, category, level, price, "originalPrice", image, duration, "lessonsCount", "studentsCount", "ratingAverage", "ratingCount", description, tags) VALUES
  (1, 'Programming Logic from Scratch', 'Marcos Villela', 'Technology', 'Beginner', 79.9, 149.9, '/img/courses/programacao.svg', 12, 38, 4210, 4.7, 612, 'Learn the fundamentals of logic and algorithms before choosing your first programming language.', '["logic","algorithms","beginner"]'::jsonb),
  (2, 'Automated Testing with Cypress and Playwright', 'Fernanda Lopes', 'Technology', 'Intermediate', 129.9, NULL, '/img/courses/testes.svg', 18, 52, 2830, 4.8, 401, 'Master hands-on end-to-end test automation with real projects and CI pipeline integration.', '["cypress","playwright","qa"]'::jsonb),
  (3, 'Advanced Excel for the Job Market', 'Renata Aguiar', 'Productivity', 'Intermediate', 59.9, 99.9, '/img/courses/excel.svg', 10, 30, 6790, 4.6, 980, 'Advanced formulas, pivot tables, and dashboards to stand out in any hiring process.', '["excel","spreadsheets","data"]'::jsonb),
  (4, 'How to Prepare for Job Interviews', 'Paulo Menezes', 'Career', 'Beginner', 0, NULL, '/img/courses/entrevista.svg', 4, 14, 9120, 4.5, 1230, 'Free course with practical techniques to prepare for interviews, from your resume to the follow-up.', '["career","interview","free"]'::jsonb),
  (5, 'English for International Interviews', 'Julia Castro', 'Languages', 'Intermediate', 89.9, NULL, '/img/courses/nao-existe.svg', 8, 24, 1540, 4.4, 205, 'Vocabulary and interview simulations in English for jobs at international companies.', '["english","languages","interview"]'::jsonb),
  (6, 'UX/UI Design Fundamentals', 'Bianca Rocha', 'Design', 'Beginner', 99.9, 179.9, '/img/courses/uxui.svg', 14, 40, 3320, 4.7, 512, 'Product design principles, prototyping in Figma, and how to build your first portfolio.', '["ux","ui","figma"]'::jsonb),
  (7, 'Digital Marketing and Social Media', 'Diego Ramos', 'Marketing', 'Beginner', 69.9, NULL, '/img/courses/marketing.svg', 9, 26, 4020, 4.3, 388, 'Content strategy, paid traffic, and essential metrics to get started in digital marketing.', '["marketing","social media","ads"]'::jsonb),
  (8, 'Introduction to Data Analysis with Excel and SQL', 'Camila Duarte', 'Data', 'Intermediate', 119.9, 199.9, '/img/courses/dados.svg', 16, 44, 2150, 4.8, 340, 'SQL queries, data cleaning, and visualizations to take your first steps in data analysis.', '["sql","data","analysis"]'::jsonb),
  (9, 'Leadership and Team Management', 'Roberto Nascimento', 'Management', 'Advanced', 149.9, 249.9, '/img/courses/gestao.svg', 11, 28, 1870, 4.6, 264, 'Practical leadership, feedback, and conflict management tools for team leaders.', '["leadership","management","soft skills"]'::jsonb),
  (10, 'Sales and Negotiation Techniques', 'Aline Ferreira', 'Sales', 'Intermediate', 79.9, NULL, '/img/courses/vendas.svg', 10, 32, 2960, 4.5, 301, 'Approach, negotiation, and closing techniques applied to B2B and B2C sales.', '["sales","negotiation"]'::jsonb);

-- enrollments
INSERT INTO enrollments (id, "userId", "courseId", "pricePaid", "purchasedAt") VALUES
  (1, 1, 2, 129.9, '2026-08-10T13:20:00.000Z'),
  (2, 1, 4, 0, '2026-08-15T09:05:00.000Z');

-- The rows above use explicit ids, so move each id sequence past them
-- (otherwise the next INSERT would try to reuse id 1).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies', 'jobs', 'users', 'experiences', 'applications', 'reviews', 'courses', 'enrollments', 'course_orders'] LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, ''id''), COALESCE((SELECT MAX(id) FROM %I), 0) + 1, false)', t, t);
  END LOOP;
END $$;
