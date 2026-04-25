import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type JWTPayload = { id: number; role: string; full_name: string };

const db = new Database("school.db");
const JWT_SECRET = process.env.JWT_SECRET || "kizaga-secret-key-2026";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    tsc_no TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('headmaster', 'academic', 'teacher'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    form TEXT NOT NULL,
    parent_phone TEXT,
    stream_id INTEGER,
    FOREIGN KEY(stream_id) REFERENCES streams(id)
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    form TEXT NOT NULL,
    has_practical INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    FOREIGN KEY(teacher_id) REFERENCES users(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS streams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(form, name)
  );

  CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    school_name TEXT NOT NULL,
    school_logo TEXT,
    academic_year TEXT NOT NULL,
    address TEXT,
    region TEXT,
    district TEXT
  );

  CREATE TABLE IF NOT EXISTS stream_subjects (
    stream_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    PRIMARY KEY(stream_id, subject_id),
    FOREIGN KEY(stream_id) REFERENCES streams(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    competence TEXT,
    specific_competence TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'on_progress', 'completed')),
    tested INTEGER NOT NULL DEFAULT 0 CHECK(tested IN (0, 1)),
    deadline DATETIME,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS topic_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    score REAL,
    absent INTEGER NOT NULL DEFAULT 0 CHECK(absent IN (0, 1)),
    UNIQUE(topic_id, student_id),
    FOREIGN KEY(topic_id) REFERENCES topics(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    form TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    term TEXT,
    start_date DATE,
    end_date DATE,
    is_composed INTEGER DEFAULT 0,
    weight REAL DEFAULT 1.0,
    created_by INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exam_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    weight REAL DEFAULT 1.0,
    pass_mark REAL DEFAULT 0,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    UNIQUE(exam_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS exam_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    score REAL,
    absent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    UNIQUE(exam_id, student_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS student_exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    total_marks REAL,
    average REAL,
    grade TEXT,
    division INTEGER,
    points INTEGER,
    position_class INTEGER,
    position_stream INTEGER,
    remark TEXT,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(student_id) REFERENCES students(id),
    UNIQUE(exam_id, student_id)
  );

CREATE TABLE IF NOT EXISTS exam_compositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    form TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    composition_json TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exam_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    from_exam_id INTEGER NOT NULL,
    to_exam_id INTEGER NOT NULL,
    avg_change REAL,
    position_change INTEGER,
    division_change INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(from_exam_id) REFERENCES exams(id),
    FOREIGN KEY(to_exam_id) REFERENCES exams(id)
  );
`);

// Ensure settings row exists
try {
  db.prepare(
    `INSERT OR IGNORE INTO school_settings (id, school_name, school_logo, academic_year, address, region, district)
     VALUES (1, 'Kizaga Secondary School', NULL, '2026', NULL, NULL, NULL)`
  ).run();
} catch (e) {
  console.warn('School settings initialization skipped:', e);
}

// Lightweight schema migration for existing DBs
try {
  const resultCols = db.prepare("PRAGMA table_info(results)").all() as any[];
  const hasComponent = resultCols.some(c => c.name === 'component');
  const hasAbsent = resultCols.some(c => c.name === 'absent');

  if (!hasComponent) {
    db.exec("ALTER TABLE results ADD COLUMN component TEXT NOT NULL DEFAULT 'theory'");
  }
  if (!hasAbsent) {
    db.exec("ALTER TABLE results ADD COLUMN absent INTEGER NOT NULL DEFAULT 0");
  }

  // De-dupe any legacy rows before enforcing uniqueness
  db.exec(`
    DELETE FROM results
    WHERE rowid NOT IN (
      SELECT MAX(rowid)
      FROM results
      GROUP BY student_id, exam_id, subject_id, component
    );
  `);

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS results_unique ON results(student_id, exam_id, subject_id, component)");
} catch (e) {
  console.warn('Results schema migration skipped:', e);
}

// Lightweight schema migration for topics
try {
  const topicCols = db.prepare("PRAGMA table_info(topics)").all() as any[];
  const hasTested = topicCols.some(c => c.name === 'tested');
  if (!hasTested) {
    db.exec("ALTER TABLE topics ADD COLUMN tested INTEGER NOT NULL DEFAULT 0");
  }
} catch (e) {
  console.warn('Topics schema migration skipped:', e);
}

// Lightweight schema migration for users (profile fields)
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
  const names = new Set(userCols.map(c => c.name));
  const addText = (col: string) => {
    if (!names.has(col)) db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
  };

  addText('gender');
  addText('education_level');
  addText('studied_subjects');
  addText('teaching_subjects');
  addText('cheque_no');
  addText('employment_date');
  addText('confirmation_date');
  addText('retirement_date');
  addText('salary_scale');
  addText('date_of_birth');
  addText('nida_no');

  // Prevent accidental duplicates when IDs exist.
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_nida_unique ON users(nida_no) WHERE nida_no IS NOT NULL");
} catch (e) {
  console.warn('Users schema migration skipped:', e);
}

// Lightweight schema migration for students
try {
  const studentCols = db.prepare("PRAGMA table_info(students)").all() as any[];
  const hasStreamId = studentCols.some(c => c.name === 'stream_id');
  if (!hasStreamId) {
    db.exec("ALTER TABLE students ADD COLUMN stream_id INTEGER");
  }
} catch (e) {
  console.warn('Students schema migration skipped:', e);
}

// Lightweight schema migration for school settings (logo)
try {
  const settingsCols = db.prepare("PRAGMA table_info(school_settings)").all() as any[];
  const hasLogo = settingsCols.some(c => c.name === 'school_logo');
  if (!hasLogo) {
    db.exec("ALTER TABLE school_settings ADD COLUMN school_logo TEXT");
  }
} catch (e) {
  console.warn('School settings logo migration skipped:', e);
}

// Insert default headmaster if none exists
const headmaster = db.prepare("SELECT * FROM users WHERE role = 'headmaster'").get();
if (!headmaster) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Headmaster Kizaga",
    "admin@kizaga.sc.tz",
    hashedPassword,
    "headmaster"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Middleware for Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      (req as any).user = user as JWTPayload;
      next();
    });
  };

  // --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role, full_name: user.full_name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, role: user.role, full_name: user.full_name } });
  });

  // Users Management (Headmaster/Academic)
  app.get("/api/users", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);
    const users = db.prepare("SELECT id, full_name, tsc_no, email, phone, role FROM users").all();
    res.json(users);
  });

  // School settings
  app.get('/api/settings/school', authenticateToken, (req, res) => {
    const actor = (req as any).user;
    if (actor.role !== 'headmaster' && actor.role !== 'academic') return res.sendStatus(403);

    const row = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as any;
    if (!row) {
      return res.json({
        school_name: 'Kizaga Secondary School',
        academic_year: '2026',
        school_logo: '',
        address: '',
        region: '',
        district: '',
      });
    }
    res.json({
      school_name: row.school_name,
      school_logo: row.school_logo || '',
      academic_year: row.academic_year,
      address: row.address || '',
      region: row.region || '',
      district: row.district || '',
    });
  });

  app.put('/api/settings/school', authenticateToken, (req, res) => {
    const actor = (req as any).user;
    if (actor.role !== 'headmaster' && actor.role !== 'academic') return res.sendStatus(403);

    const { school_name, school_logo, academic_year, address, region, district } = req.body as any;
    if (!school_name || !academic_year) {
      return res.status(400).json({ error: 'school_name and academic_year are required' });
    }

    const normText = (v: any) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s.length === 0 ? null : s;
    };

    try {
      db.prepare(
        `INSERT INTO school_settings (id, school_name, school_logo, academic_year, address, region, district)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           school_name = excluded.school_name,
           school_logo = excluded.school_logo,
           academic_year = excluded.academic_year,
           address = excluded.address,
           region = excluded.region,
           district = excluded.district`
      ).run(
        String(school_name).trim(),
        normText(school_logo),
        String(academic_year).trim(),
        normText(address),
        normText(region),
        normText(district),
      );

      res.json({ message: 'School settings saved' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/users", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster') return res.sendStatus(403);
    const { full_name, tsc_no, email, password, phone, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      db.prepare("INSERT INTO users (full_name, tsc_no, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)").run(
        full_name, tsc_no, email, hashedPassword, phone, role
      );
      res.status(201).json({ message: "User created" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/users/:id", authenticateToken, (req, res) => {
    const actor = (req as any).user;
    if (actor.role !== 'headmaster') return res.sendStatus(403);

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid user id' });

    const { full_name, tsc_no, email, password, phone, role } = req.body as any;
    const nextRole = String(role || '').trim();
    if (!full_name || !email || !nextRole) return res.status(400).json({ error: 'full_name, email, role are required' });
    if (!['headmaster', 'academic', 'teacher'].includes(nextRole)) return res.status(400).json({ error: 'Invalid role' });

    const existing = db.prepare('SELECT id, password FROM users WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const hasPassword = typeof password === 'string' && password.trim().length > 0;
    const nextPassword = hasPassword ? bcrypt.hashSync(password, 10) : existing.password;

    try {
      db.prepare(
        'UPDATE users SET full_name = ?, tsc_no = ?, email = ?, password = ?, phone = ?, role = ? WHERE id = ?'
      ).run(full_name, tsc_no || null, email, nextPassword, phone || null, nextRole, id);

      res.json({ message: 'User updated' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // My Profile (each staff updates own profile)
  app.get('/api/users/me', authenticateToken, (req, res) => {
    const actor = (req as any).user as JWTPayload;
    console.log('[profile] actor:', JSON.stringify(actor));
    const row = db.prepare(`
      SELECT
        id, full_name, tsc_no, email, phone, role,
        gender, education_level, studied_subjects, teaching_subjects,
        cheque_no, employment_date, confirmation_date, retirement_date,
        salary_scale, date_of_birth, nida_no
      FROM users
      WHERE id = ?
    `).get(actor.id) as any;

    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...row,
      gender: row.gender || '',
      education_level: row.education_level || '',
      studied_subjects: row.studied_subjects || '',
      teaching_subjects: row.teaching_subjects || '',
      cheque_no: row.cheque_no || '',
      employment_date: row.employment_date || '',
      confirmation_date: row.confirmation_date || '',
      retirement_date: row.retirement_date || '',
      salary_scale: row.salary_scale || '',
      date_of_birth: row.date_of_birth || '',
      nida_no: row.nida_no || '',
    });
  });

  app.put('/api/users/me', authenticateToken, (req, res) => {
    const actor = (req as any).user as JWTPayload;
    console.log('[profile PUT] actor:', JSON.stringify(actor));
    const current = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(actor.id) as any;
    if (!current) return res.status(404).json({ error: 'User not found' });

    const norm = (v: any) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s.length === 0 ? null : s;
    };

    const full_name = norm(req.body?.full_name);
    if (!full_name) return res.status(400).json({ error: 'full_name is required' });

    const gender = norm(req.body?.gender);
    const education_level = norm(req.body?.education_level);
    const studied_subjects = norm(req.body?.studied_subjects);
    const teaching_subjects = norm(req.body?.teaching_subjects);
    const tsc_no = norm(req.body?.tsc_no);
    const cheque_no = norm(req.body?.cheque_no);
    const employment_date = norm(req.body?.employment_date);
    const confirmation_date = norm(req.body?.confirmation_date);
    const retirement_date = norm(req.body?.retirement_date);
    const salary_scale = norm(req.body?.salary_scale);
    const date_of_birth = norm(req.body?.date_of_birth);
    const nida_no = norm(req.body?.nida_no);

    try {
      db.prepare(`
        UPDATE users SET
          full_name = ?,
          tsc_no = ?,
          gender = ?,
          education_level = ?,
          studied_subjects = ?,
          teaching_subjects = ?,
          cheque_no = ?,
          employment_date = ?,
          confirmation_date = ?,
          retirement_date = ?,
          salary_scale = ?,
          date_of_birth = ?,
          nida_no = ?
        WHERE id = ?
      `).run(
        full_name,
        tsc_no,
        gender,
        education_level,
        studied_subjects,
        teaching_subjects,
        cheque_no,
        employment_date,
        confirmation_date,
        retirement_date,
        salary_scale,
        date_of_birth,
        nida_no,
        actor.id
      );

      res.json({ message: 'Profile updated' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Students Management
  app.get("/api/students", authenticateToken, (req, res) => {
    const { subject_id, form } = req.query as any;

    const baseSelect = `
      SELECT st.*, s.name as stream_name
      FROM students st
      LEFT JOIN streams s ON st.stream_id = s.id
    `;

    if (subject_id) {
      const subjectId = Number(subject_id);
      if (!Number.isFinite(subjectId)) return res.status(400).json({ error: 'Invalid subject_id' });

      const subject = db.prepare('SELECT id, form FROM subjects WHERE id = ?').get(subjectId) as any;
      if (!subject) return res.status(404).json({ error: 'Subject not found' });

      // Include legacy students with no stream, plus those whose stream includes the subject.
      const students = db.prepare(
        `${baseSelect}
         WHERE st.form = ?
           AND (
             st.stream_id IS NULL
             OR EXISTS (
               SELECT 1 FROM stream_subjects ss
               WHERE ss.stream_id = st.stream_id AND ss.subject_id = ?
             )
           )
         ORDER BY st.full_name ASC`
      ).all(subject.form, subjectId);

      return res.json(students);
    }

    if (form) {
      const students = db.prepare(`${baseSelect} WHERE st.form = ? ORDER BY st.full_name ASC`).all(String(form));
      return res.json(students);
    }

    const students = db.prepare(`${baseSelect} ORDER BY st.form ASC, st.full_name ASC`).all();
    res.json(students);
  });

  app.post("/api/students", authenticateToken, (req, res) => {
    const { full_name, gender, form, parent_phone, stream_id } = req.body as any;

    let streamId: number | null = null;
    if (stream_id !== undefined && stream_id !== null && String(stream_id).trim() !== '') {
      const n = Number(stream_id);
      if (!Number.isFinite(n)) return res.status(400).json({ error: 'Invalid stream_id' });
      streamId = n;
    }

    if (streamId !== null) {
      const stream = db.prepare('SELECT id, form FROM streams WHERE id = ?').get(streamId) as any;
      if (!stream) return res.status(400).json({ error: 'Stream not found' });
      if (stream.form !== form) return res.status(400).json({ error: 'Stream form must match student form' });
    }

    db.prepare("INSERT INTO students (full_name, gender, form, parent_phone, stream_id) VALUES (?, ?, ?, ?, ?)").run(
      full_name,
      gender,
      form,
      parent_phone,
      streamId
    );
    res.status(201).json({ message: "Student registered" });
  });

  app.put("/api/students/:id", authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid student id' });

    const { full_name, gender, form, parent_phone } = req.body as any;
    const hasStreamInBody = Object.prototype.hasOwnProperty.call(req.body || {}, 'stream_id');
    const rawStreamId = (req.body || {})?.stream_id;

    const current = db.prepare('SELECT id, form, stream_id FROM students WHERE id = ?').get(id) as any;
    if (!current) return res.status(404).json({ error: 'Student not found' });

    let nextStreamId: number | null = current.stream_id ?? null;

    if (hasStreamInBody) {
      if (rawStreamId === null || rawStreamId === undefined || String(rawStreamId).trim() === '') {
        nextStreamId = null;
      } else {
        const n = Number(rawStreamId);
        if (!Number.isFinite(n)) return res.status(400).json({ error: 'Invalid stream_id' });
        nextStreamId = n;
      }
    } else {
      // If the form changes and stream isn't explicitly sent, clear it to avoid mismatches.
      if (form !== current.form) nextStreamId = null;
    }

    if (nextStreamId !== null) {
      const stream = db.prepare('SELECT id, form FROM streams WHERE id = ?').get(nextStreamId) as any;
      if (!stream) return res.status(400).json({ error: 'Stream not found' });
      if (stream.form !== form) return res.status(400).json({ error: 'Stream form must match student form' });
    }

    db.prepare(
      "UPDATE students SET full_name = ?, gender = ?, form = ?, parent_phone = ?, stream_id = ? WHERE id = ?"
    ).run(full_name, gender, form, parent_phone, nextStreamId, id);

    res.json({ message: "Student updated" });
  });

  app.delete("/api/students/:id", authenticateToken, (req, res) => {
    db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
    res.json({ message: "Student removed" });
  });

  app.post("/api/students/bulk", authenticateToken, (req, res) => {
    const students = req.body; // Array of student objects
    const insert = db.prepare("INSERT INTO students (full_name, gender, form, parent_phone, stream_id) VALUES (?, ?, ?, ?, NULL)");
    const insertMany = db.transaction((list) => {
      for (const s of list) insert.run(s.full_name, s.gender, s.form, s.parent_phone);
    });
    insertMany(students);
    res.json({ message: `${students.length} students registered` });
  });

  app.post("/api/students/promote", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);
    
    const promotionMap: {[key: string]: string} = {
      'Form 1': 'Form 2',
      'Form 2': 'Form 3',
      'Form 3': 'Form 4',
      'Form 4': 'Graduated'
    };

    const students = db.prepare("SELECT id, form FROM students WHERE form != 'Graduated'").all() as any[];
    const update = db.prepare("UPDATE students SET form = ?, stream_id = NULL WHERE id = ?");
    
    const promoteAll = db.transaction((list) => {
      for (const s of list) {
        const nextForm = promotionMap[s.form];
        if (nextForm) update.run(nextForm, s.id);
      }
    });
    
    promoteAll(students);
    res.json({ message: "Students promoted successfully" });
  });

  // Subjects Management
  app.get("/api/subjects", authenticateToken, (req, res) => {
    const subjects = db.prepare("SELECT * FROM subjects").all() as any[];
    // Normalize SQLite ints to booleans for the frontend.
    res.json(subjects.map(s => ({ ...s, has_practical: (s.has_practical ?? 0) === 1 })));
  });

  app.post("/api/subjects", authenticateToken, (req, res) => {
    const { name, code, form, has_practical } = req.body;
    db.prepare("INSERT INTO subjects (name, code, form, has_practical) VALUES (?, ?, ?, ?)").run(
      name, code, form, has_practical ? 1 : 0
    );
    res.status(201).json({ message: "Subject registered" });
  });

  app.put("/api/subjects/:id", authenticateToken, (req, res) => {
    const { name, code, form, has_practical } = req.body;
    try {
      db.prepare("UPDATE subjects SET name = ?, code = ?, form = ?, has_practical = ? WHERE id = ?").run(
        name,
        code,
        form,
        has_practical ? 1 : 0,
        req.params.id
      );
      res.json({ message: "Subject updated" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/subjects/:id", authenticateToken, (req, res) => {
    const subjectId = Number(req.params.id);

    // Prevent destructive deletes when the subject is referenced.
    const assignmentsCount = db.prepare("SELECT COUNT(1) as c FROM assignments WHERE subject_id = ?").get(subjectId) as any;
    const topicsCount = db.prepare("SELECT COUNT(1) as c FROM topics WHERE subject_id = ?").get(subjectId) as any;
    const resultsCount = db.prepare("SELECT COUNT(1) as c FROM results WHERE subject_id = ?").get(subjectId) as any;

    const used = (assignmentsCount?.c ?? 0) + (topicsCount?.c ?? 0) + (resultsCount?.c ?? 0);
    if (used > 0) {
      return res.status(400).json({
        error: "Cannot delete this subject because it is used in assignments/topics/results. Remove related records first.",
      });
    }

    db.prepare("DELETE FROM subjects WHERE id = ?").run(subjectId);
    res.json({ message: "Subject removed" });
  });

  // Assignments
  app.get("/api/assignments", authenticateToken, (req, res) => {
    const assignments = db.prepare(`
      SELECT a.*, u.full_name as teacher_name, s.name as subject_name, s.form 
      FROM assignments a
      JOIN users u ON a.teacher_id = u.id
      JOIN subjects s ON a.subject_id = s.id
    `).all();
    res.json(assignments);
  });

  app.post("/api/assignments", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);
    const { teacher_id, subject_id } = req.body;
    db.prepare("INSERT INTO assignments (teacher_id, subject_id) VALUES (?, ?)").run(teacher_id, subject_id);
    res.json({ message: "Assignment created" });
  });

  app.put("/api/assignments/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);
    const { teacher_id, subject_id } = req.body;
    db.prepare("UPDATE assignments SET teacher_id = ?, subject_id = ? WHERE id = ?").run(
      teacher_id,
      subject_id,
      req.params.id
    );
    res.json({ message: "Assignment updated" });
  });

  app.delete("/api/assignments/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);
    db.prepare("DELETE FROM assignments WHERE id = ?").run(req.params.id);
    res.json({ message: "Assignment removed" });
  });

  // Streams (Classes/Mikondo)
  app.get("/api/streams", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);

    const { form } = req.query as any;
    const streams = form
      ? (db.prepare("SELECT * FROM streams WHERE form = ? ORDER BY name ASC").all(form) as any[])
      : (db.prepare("SELECT * FROM streams ORDER BY form ASC, name ASC").all() as any[]);

    if (streams.length === 0) return res.json([]);

    const ids = streams.map(s => s.id);

    const map = new Map<number, number[]>();
    for (const s of streams) map.set(s.id, []);

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const links = db.prepare(`SELECT stream_id, subject_id FROM stream_subjects WHERE stream_id IN (${placeholders})`).all(...ids) as any[];
      for (const l of links) {
        const arr = map.get(l.stream_id);
        if (arr) arr.push(l.subject_id);
      }
    }

    res.json(streams.map(s => ({ ...s, subject_ids: map.get(s.id) || [] })));
  });

  app.post("/api/streams", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);

    const { form, name } = req.body as any;
    if (!form || !name) return res.status(400).json({ error: 'form and name are required' });
    try {
      const info = db.prepare("INSERT INTO streams (form, name) VALUES (?, ?)").run(form, String(name).trim());
      res.status(201).json({ id: info.lastInsertRowid, message: 'Stream created' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/streams/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);

    const { form, name } = req.body as any;
    if (!form || !name) return res.status(400).json({ error: 'form and name are required' });
    try {
      db.prepare("UPDATE streams SET form = ?, name = ? WHERE id = ?").run(form, String(name).trim(), req.params.id);
      res.json({ message: 'Stream updated' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/streams/:id/subjects", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);

    const streamId = Number(req.params.id);
    const { subject_ids } = req.body as any;
    const ids = Array.isArray(subject_ids) ? subject_ids.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];

    const stream = db.prepare("SELECT * FROM streams WHERE id = ?").get(streamId) as any;
    if (!stream) return res.status(404).json({ error: 'Stream not found' });

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const subjects = db.prepare(`SELECT id, form FROM subjects WHERE id IN (${placeholders})`).all(...ids) as any[];
      const ok = subjects.length === ids.length && subjects.every(s => s.form === stream.form);
      if (!ok) {
        return res.status(400).json({ error: 'All subjects must belong to the same form as the stream' });
      }
    }

    const tx = db.transaction(() => {
      db.prepare("DELETE FROM stream_subjects WHERE stream_id = ?").run(streamId);
      const insert = db.prepare("INSERT INTO stream_subjects (stream_id, subject_id) VALUES (?, ?)");
      for (const sid of ids) insert.run(streamId, sid);
    });

    tx();
    res.json({ message: 'Stream subjects updated' });
  });

  app.delete("/api/streams/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'headmaster' && user.role !== 'academic') return res.sendStatus(403);

    const streamId = Number(req.params.id);
    const tx = db.transaction(() => {
      db.prepare("UPDATE students SET stream_id = NULL WHERE stream_id = ?").run(streamId);
      db.prepare("DELETE FROM stream_subjects WHERE stream_id = ?").run(streamId);
      db.prepare("DELETE FROM streams WHERE id = ?").run(streamId);
    });
    tx();
    res.json({ message: 'Stream removed' });
  });

  // Topics
  app.get("/api/topics", authenticateToken, (req, res) => {
    const { subject_id } = req.query;
    let query = "SELECT * FROM topics";
    let params = [];
    if (subject_id) {
      query += " WHERE subject_id = ?";
      params.push(subject_id);
    }
    const topics = db.prepare(query).all(params) as any[];
    res.json(topics.map(t => ({ ...t, tested: (t.tested ?? 0) === 1 })));
  });

  app.post("/api/topics", authenticateToken, (req, res) => {
    const { subject_id, name, competence, specific_competence, deadline } = req.body;
    db.prepare("INSERT INTO topics (subject_id, name, competence, specific_competence, deadline, tested) VALUES (?, ?, ?, ?, ?, 0)").run(
      subject_id,
      name,
      competence,
      specific_competence,
      deadline
    );
    res.json({ message: "Topic added" });
  });

  app.patch("/api/topics/:id", authenticateToken, (req, res) => {
    const { status, tested } = req.body as any;

    const sets: string[] = [];
    const params: any[] = [];
    if (status !== undefined) {
      sets.push("status = ?");
      params.push(status);
    }
    if (tested !== undefined) {
      sets.push("tested = ?");
      params.push(tested ? 1 : 0);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(req.params.id);
    db.prepare(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json({ message: "Topic updated" });
  });

  // Bulk test counts for topics
  app.get("/api/topics/test-counts", authenticateToken, (req, res) => {
    const { ids } = req.query as any;
    if (!ids || typeof ids !== 'string') return res.json([]);

    const topicIds = ids.split(',').map((x: string) => Number(x)).filter((x: number) => Number.isFinite(x));
    if (topicIds.length === 0) return res.json([]);

    const placeholders = topicIds.map(() => '?').join(',');
    const topics = db.prepare(`SELECT id, subject_id FROM topics WHERE id IN (${placeholders})`).all(...topicIds) as any[];

    const results: { topic_id: number; total: number; entered: number; passed: number; failed: number }[] = [];

    for (const topic of topics) {
      const subject = db.prepare('SELECT form FROM subjects WHERE id = ?').get(topic.subject_id) as any;
      if (!subject) continue;

      const totalStudents = db.prepare(
        `SELECT COUNT(1) as total FROM students st
         WHERE st.form = ?
           AND (
             st.stream_id IS NULL
             OR EXISTS (
               SELECT 1 FROM stream_subjects ss
               WHERE ss.stream_id = st.stream_id AND ss.subject_id = ?
             )
           )`
      ).get(subject.form, topic.subject_id) as any;

      const testRows = db.prepare(
        `SELECT score, absent FROM topic_test_results WHERE topic_id = ?`
      ).all(topic.id) as any[];

      const total = totalStudents?.total ?? 0;
      const entered = testRows.filter(r => (r.score !== null && r.score !== undefined) || r.absent === 1).length;
      const passed = testRows.filter(r => r.score !== null && r.absent !== 1 && Number(r.score) >= 50).length;
      const failed = testRows.filter(r => r.score !== null && r.absent !== 1 && Number(r.score) < 50).length;

      results.push({ topic_id: topic.id, total, entered, passed, failed });
    }

    res.json(results);
  });

  // Get students for a topic (based on subject + form)
  app.get("/api/topics/:id/students", authenticateToken, (req, res) => {
    const topicId = Number(req.params.id);
    if (!Number.isFinite(topicId)) return res.status(400).json({ error: 'Invalid topic id' });

    const topic = db.prepare('SELECT id, subject_id FROM topics WHERE id = ?').get(topicId) as any;
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const subject = db.prepare('SELECT id, form FROM subjects WHERE id = ?').get(topic.subject_id) as any;
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const students = db.prepare(
      `SELECT st.id, st.full_name, st.gender
       FROM students st
       WHERE st.form = ?
       AND (
         st.stream_id IS NULL
         OR EXISTS (
           SELECT 1 FROM stream_subjects ss
           WHERE ss.stream_id = st.stream_id AND ss.subject_id = ?
         )
       )
       ORDER BY st.full_name ASC`
    ).all(subject.form, subject.id);

    res.json(students);
  });

  // Get test results for a topic
  app.get("/api/topics/:id/test-results", authenticateToken, (req, res) => {
    const topicId = Number(req.params.id);
    if (!Number.isFinite(topicId)) return res.status(400).json({ error: 'Invalid topic id' });

    const topic = db.prepare('SELECT id, subject_id, name FROM topics WHERE id = ?').get(topicId) as any;
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const subject = db.prepare('SELECT id, form, name FROM subjects WHERE id = ?').get(topic.subject_id) as any;

    const results = db.prepare(
      `SELECT ttr.*, st.full_name as student_name
       FROM topic_test_results ttr
       JOIN students st ON st.id = ttr.student_id
       WHERE ttr.topic_id = ?
       ORDER BY st.full_name ASC`
    ).all(topicId);

    res.json({
      topic: { id: topic.id, name: topic.name },
      subject: subject ? { id: subject.id, name: subject.name, form: subject.form } : null,
      results,
    });
  });

  // Save or update test results for a topic
  app.post("/api/topics/:id/test-results", authenticateToken, (req, res) => {
    const topicId = Number(req.params.id);
    if (!Number.isFinite(topicId)) return res.status(400).json({ error: 'Invalid topic id' });

    const topic = db.prepare('SELECT id, subject_id FROM topics WHERE id = ?').get(topicId) as any;
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const { results } = req.body as any;
    if (!Array.isArray(results)) return res.status(400).json({ error: 'results must be an array' });

    const upsert = db.prepare(
      `INSERT INTO topic_test_results (topic_id, student_id, score, absent)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(topic_id, student_id)
       DO UPDATE SET score = excluded.score, absent = excluded.absent`
    );

    const tx = db.transaction(() => {
      for (const r of results) {
        const studentId = Number(r.student_id);
        const absent = r.absent ? 1 : 0;
        const score = absent ? null : Number(r.score);
        if (Number.isFinite(studentId)) {
          upsert.run(topicId, studentId, score, absent);
        }
      }

      // Determine total students eligible for this topic's subject
      const subject = db.prepare('SELECT form FROM subjects WHERE id = ?').get(topic.subject_id) as any;
      const totalStudents = db.prepare(
        `SELECT COUNT(1) as total FROM students st
         WHERE st.form = ?
           AND (
             st.stream_id IS NULL
             OR EXISTS (
               SELECT 1 FROM stream_subjects ss
               WHERE ss.stream_id = st.stream_id AND ss.subject_id = ?
             )
           )`
      ).get(subject?.form, topic.subject_id) as any;

      const testedCount = db.prepare(
        `SELECT COUNT(1) as c FROM topic_test_results
         WHERE topic_id = ? AND (score IS NOT NULL OR absent = 1)`
      ).get(topicId) as any;

      const total = totalStudents?.total ?? 0;
      const count = testedCount?.c ?? 0;
      // Auto-mark tested if more than 50% of class students have test results
      if (total > 0 && count > Math.floor(total / 2)) {
        db.prepare('UPDATE topics SET tested = 1 WHERE id = ?').run(topicId);
      }
    });

    try {
      tx();
      res.json({ message: 'Test results saved' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Curriculum overview by class (form)
  app.get("/api/curriculum/overview", authenticateToken, (req, res) => {
    const { form } = req.query as any;
    const hasForm = typeof form === 'string' && form.trim().length > 0;
    const rows = db.prepare(`
      SELECT
        s.id,
        s.name,
        s.code,
        s.form,
        s.has_practical,
        COUNT(t.id) as total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_topics,
        SUM(CASE WHEN t.status = 'on_progress' THEN 1 ELSE 0 END) as on_progress_topics,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_topics,
        SUM(CASE WHEN t.tested = 1 THEN 1 ELSE 0 END) as tested_topics
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      ${hasForm ? 'WHERE s.form = ?' : ''}
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all(hasForm ? [form] : []) as any[];

    res.json(rows.map(r => ({
      ...r,
      has_practical: (r.has_practical ?? 0) === 1,
      total_topics: Number(r.total_topics ?? 0),
      completed_topics: Number(r.completed_topics ?? 0),
      on_progress_topics: Number(r.on_progress_topics ?? 0),
      pending_topics: Number(r.pending_topics ?? 0),
      tested_topics: Number(r.tested_topics ?? 0),
    })));
  });

  // ========== EXAM PROCESSING MODULE ==========
  const getGrade = (avg: number): { grade: string; division: number; points: number; remark: string } => {
    if (avg >= 80) return { grade: 'A', division: 1, points: 1, remark: 'Excellent' };
    if (avg >= 65) return { grade: 'B', division: 2, points: 2, remark: 'Very Good' };
    if (avg >= 50) return { grade: 'C', division: 3, points: 3, remark: 'Good' };
    if (avg >= 40) return { grade: 'D', division: 4, points: 4, remark: 'Average' };
    return { grade: 'F', division: 0, points: 5, remark: 'Fail' };
  };

  const getTrendIcon = (current: number, previous: number): string => {
    if (current > previous + 2) return '↑';
    if (current < previous - 2) return '↓';
    return '→';
  };

  // GET ALL EXAMS
  app.get("/api/exams", authenticateToken, (req, res) => {
    const { form, academic_year, type } = req.query as any;
    let query = "SELECT * FROM exams";
    const params: any[] = [];
    const conditions: string[] = [];
    if (form) { conditions.push('form = ?'); params.push(form); }
    if (academic_year) { conditions.push('academic_year = ?'); params.push(academic_year); }
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY id DESC';
    const exams = db.prepare(query).all(...params);
    res.json(exams);
  });

  // CREATE EXAM
  app.post("/api/exams", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    const { name, type, form, academic_year, term, start_date, end_date, weight } = req.body;
    if (!name || !type || !form || !academic_year) {
      return res.status(400).json({ error: 'name, type, form, academic_year required' });
    }
    const info = db.prepare(
      "INSERT INTO exams (name, type, form, academic_year, term, start_date, end_date, weight, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(name, type, form, academic_year, term || null, start_date || null, end_date || null, weight || 1.0, user.id);
    res.json({ message: "Exam created", id: info.lastInsertRowid });
  });

  // UPDATE EXAM
  app.put("/api/exams/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    const { name, type, form, academic_year, term, start_date, end_date, weight } = req.body;
    db.prepare(
      "UPDATE exams SET name = ?, type = ?, form = ?, academic_year = ?, term = ?, start_date = ?, end_date = ?, weight = ? WHERE id = ?"
    ).run(name, type, form, academic_year, term || null, start_date || null, end_date || null, weight || 1.0, req.params.id);
    res.json({ message: "Exam updated" });
  });

  // DELETE EXAM
  app.delete("/api/exams/:id", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    db.prepare("DELETE FROM exam_scores WHERE exam_id = ?").run(req.params.id);
    db.prepare("DELETE FROM student_exam_results WHERE exam_id = ?").run(req.params.id);
    db.prepare("DELETE FROM exam_subjects WHERE exam_id = ?").run(req.params.id);
    db.prepare("DELETE FROM exams WHERE id = ?").run(req.params.id);
    res.json({ message: "Exam deleted" });
  });

  // GET EXAM SUBJECTS
  app.get("/api/exams/:id/subjects", authenticateToken, (req, res) => {
    const rows = db.prepare(`
      SELECT es.*, s.name as subject_name, s.code as subject_code
      FROM exam_subjects es
      JOIN subjects s ON es.subject_id = s.id
      WHERE es.exam_id = ?
    `).all(req.params.id);
    res.json(rows);
  });

  // ADD SUBJECTS TO EXAM
  app.post("/api/exams/:id/subjects", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    const { subject_ids, weight, pass_mark } = req.body as any;
    const examId = Number(req.params.id);
    if (!Array.isArray(subject_ids)) return res.status(400).json({ error: 'subject_ids required' });
    const insert = db.prepare(
      "INSERT OR IGNORE INTO exam_subjects (exam_id, subject_id, weight, pass_mark) VALUES (?, ?, ?, ?)"
    );
    for (const sid of subject_ids) {
      insert.run(examId, sid, weight || 1.0, pass_mark || 0);
    }
    res.json({ message: "Subjects added to exam" });
  });

  // GET STUDENTS BY FORM
  app.get("/api/exams/:id/students", authenticateToken, (req, res) => {
    const examId = Number(req.params.id);
    const exam = db.prepare("SELECT form, academic_year FROM exams WHERE id = ?").get(examId) as any;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const students = db.prepare(`
      SELECT s.id, s.full_name, s.gender, s.form, str.name as stream_name
      FROM students s
      LEFT JOIN streams str ON s.stream_id = str.id
      WHERE s.form = ? AND s.form != 'Graduated'
      ORDER BY s.full_name ASC
    `).all(exam.form);
    res.json(students);
  });

  // GET EXAM SCORES
  app.get("/api/exams/:id/scores", authenticateToken, (req, res) => {
    const { subject_id } = req.query as any;
    const examId = Number(req.params.id);
    if (subject_id) {
      const rows = db.prepare(`
        SELECT es.*, st.id as student_id, st.full_name, st.gender
        FROM exam_scores es
        JOIN students st ON es.student_id = st.id
        WHERE es.exam_id = ? AND es.subject_id = ?
        ORDER BY st.full_name ASC
      `).all(examId, subject_id);
      return res.json(rows);
    }
    const rows = db.prepare(`
      SELECT es.*, st.full_name, st.gender, sub.name as subject_name, sub.code as subject_code
      FROM exam_scores es
      JOIN students st ON es.student_id = st.id
      JOIN subjects sub ON es.subject_id = sub.id
      WHERE es.exam_id = ?
      ORDER BY st.full_name ASC, sub.name ASC
    `).all(examId);
    res.json(rows);
  });

  // SAVE EXAM SCORES
  app.post("/api/exams/:id/scores", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic' && user.role !== 'teacher') return res.sendStatus(403);
    const examId = Number(req.params.id);
    const { scores } = req.body as any;
    if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });
    
    const upsert = db.prepare(`
      INSERT INTO exam_scores (exam_id, student_id, subject_id, score, absent)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(exam_id, student_id, subject_id)
      DO UPDATE SET score = excluded.score, absent = excluded.absent
    `);
    
    const insertMany = db.transaction((list: any[]) => {
      for (const s of list) {
        const studentId = Number(s.student_id);
        const subjectId = Number(s.subject_id);
        const score = s.absent ? null : Number(s.score);
        const absent = s.absent ? 1 : 0;
        if (Number.isFinite(studentId) && Number.isFinite(subjectId)) {
          upsert.run(examId, studentId, subjectId, score, absent);
        }
      }
    });
    
    insertMany(scores);
    res.json({ message: "Scores saved" });
  });

  // PROCESS EXAM RESULTS (Calculate all student results)
  app.post("/api/exams/:id/process", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    const examId = Number(req.params.id);
    
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    const examSubjects = db.prepare(
      "SELECT subject_id, weight FROM exam_subjects WHERE exam_id = ?"
    ).all(examId) as any[];
    
    if (examSubjects.length === 0) return res.status(400).json({ error: 'No subjects configured for this exam' });
    
    const subjectIds = examSubjects.map(s => s.subject_id);
    const subjectWeights = new Map(examSubjects.map(s => [s.subject_id, s.weight]));
    
    const students = db.prepare(`
      SELECT s.id, s.full_name, s.gender, s.form, str.name as stream_name
      FROM students s
      LEFT JOIN streams str ON s.stream_id = str.id
      WHERE s.form = ? AND s.form != 'Graduated'
      ORDER BY s.full_name ASC
    `).all(exam.form);
    
    const processResult = db.transaction((studentList: any[]) => {
      for (const st of studentList) {
        let totalMarks = 0;
        let totalWeight = 0;
        
        for (const subId of subjectIds) {
          const sc = db.prepare(
            "SELECT score, absent FROM exam_scores WHERE exam_id = ? AND student_id = ? AND subject_id = ?"
          ).get(examId, st.id, subId) as any;
          
          const w = subjectWeights.get(subId) || 1;
          if (sc && !sc.absent && sc.score !== null) {
            totalMarks += (sc.score || 0) * w;
            totalWeight += w * 100;
          } else {
            totalWeight += w * 100;
          }
        }
        
        const average = totalWeight > 0 ? Math.round((totalMarks / totalWeight) * 100) / 100 : 0;
        const { grade, division, points, remark } = getGrade(average);
        
        db.prepare(`
          INSERT INTO student_exam_results (exam_id, student_id, total_marks, average, grade, division, points, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(exam_id, student_id)
          DO UPDATE SET total_marks = excluded.total_marks, average = excluded.average, grade = excluded.grade,
            division = excluded.division, points = excluded.points, remark = excluded.remark
        `).run(examId, st.id, totalMarks, average, grade, division, points, remark);
      }
    });
    
    processResult(students);
    
    // Calculate positions
    const classResults = db.prepare(`
      SELECT ser.student_id, ser.average, ser.division, st.stream_id, st.full_name
      FROM student_exam_results ser
      JOIN students st ON ser.student_id = st.id
      WHERE ser.exam_id = ?
      ORDER BY ser.average DESC
    `).all(examId) as any[];
    
    const updatePos = db.transaction((results: any[]) => {
      for (let i = 0; i < results.length; i++) {
        db.prepare("UPDATE student_exam_results SET position_class = ? WHERE exam_id = ? AND student_id = ?")
          .run(i + 1, examId, results[i].student_id);
      }
    });
    updatePos(classResults);
    
    res.json({ message: "Exam results processed", students: students.length });
  });

  // GET STUDENT EXAM RESULTS (Broadsheet)
  app.get("/api/exams/:id/results", authenticateToken, (req, res) => {
    const examId = Number(req.params.id);
    const { stream, subject_id } = req.query as any;
    
    let studentsQuery = `
      SELECT st.id, st.full_name, st.gender, st.form, str.name as stream_name,
             ser.average, ser.grade, ser.division, ser.points, ser.position_class, ser.remark
      FROM students st
      LEFT JOIN streams str ON st.stream_id = str.id
      LEFT JOIN student_exam_results ser ON st.id = ser.student_id AND ser.exam_id = ?
      WHERE st.form = (SELECT form FROM exams WHERE id = ?) AND st.form != 'Graduated'
    `;
    const params: any[] = [examId, examId];
    
    if (stream) {
      studentsQuery += " AND str.name = ?";
      params.push(stream);
    }
    studentsQuery += " ORDER BY ser.average DESC NULLS LAST, st.full_name ASC";
    
    const students = db.prepare(studentsQuery).all(...params) as any[];
    
    // Get scores for each student
    const examSubjects = db.prepare(
      "SELECT sub.id, sub.name, sub.code FROM exam_subjects es JOIN subjects sub ON es.subject_id = sub.id WHERE es.exam_id = ?"
    ).all(examId) as any[];
    
    const results = students.map((st: any) => {
      const scores: Record<string, any> = {};
      const scRows = db.prepare(`
        SELECT es.subject_id, es.score, es.absent, sub.name, sub.code
        FROM exam_scores es
        JOIN subjects sub ON es.subject_id = sub.id
        WHERE es.exam_id = ? AND es.student_id = ?
      `).all(examId, st.id) as any[];
      
      for (const sc of scRows) {
        scores[sc.code] = sc.absent ? 'ABS' : (sc.score ?? '-');
      }
      
      return { ...st, scores };
    });
    
    res.json({ subjects: examSubjects, students: results });
  });

  // DIVISION SUMMARY
  app.get("/api/exams/:id/division-summary", authenticateToken, (req, res) => {
    const examId = Number(req.params.id);
    const exam = db.prepare("SELECT form FROM exams WHERE id = ?").get(examId) as any;
    
    const rows = db.prepare(`
      SELECT st.gender, ser.division, COUNT(*) as count
      FROM student_exam_results ser
      JOIN students st ON ser.student_id = st.id
      WHERE ser.exam_id = ?
      GROUP BY st.gender, ser.division
    `).all(examId) as any[];
    
    const summary: Record<string, Record<number, number>> = { 'F': {}, 'M': {}, 'T': {} };
    for (let d = 0; d <= 4; d++) {
      summary['F'][d] = 0; summary['M'][d] = 0; summary['T'][d] = 0;
    }
    
    for (const r of rows) {
      const g = r.gender === 'Female' ? 'F' : 'M';
      summary[g][r.division] = r.count;
      summary['T'][r.division] += r.count;
    }
    
    const total = summary['T'][0] + summary['T'][1] + summary['T'][2] + summary['T'][3] + summary['T'][4];
    const passCount = total - summary['T'][0];
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;
    
    // Gender comparison
    const fTotal = summary['F'][0] + summary['F'][1] + summary['F'][2] + summary['F'][3] + summary['F'][4];
    const mTotal = summary['M'][0] + summary['M'][1] + summary['M'][2] + summary['M'][3] + summary['M'][4];
    const fPassRate = fTotal > 0 ? Math.round(((fTotal - summary['F'][0]) / fTotal) * 100) : 0;
    const mPassRate = mTotal > 0 ? Math.round(((mTotal - summary['M'][0]) / mTotal) * 100) : 0;
    
    res.json({
      exam,
      summary,
      totals: { total, passCount, passRate, fTotal, mTotal, fPassRate, mPassRate }
    });
  });

  // TREND ANALYSIS
  app.get("/api/exams/:id/trends", authenticateToken, (req, res) => {
    const examId = Number(req.params.id);
    const prevExamId = Number(req.query.compare_with);
    
    if (!prevExamId) return res.status(400).json({ error: 'compare_with exam_id required' });
    
    const currExam = db.prepare("SELECT id, name, form FROM exams WHERE id = ?").get(examId) as any;
    const prevExam = db.prepare("SELECT id, name, form FROM exams WHERE id = ?").get(prevExamId) as any;
    
    if (!currExam || !prevExam) return res.status(404).json({ error: 'Exam not found' });
    
    // Current vs Previous comparison
    const currResults = db.prepare(`
      SELECT ser.student_id, ser.average as avg, ser.division, ser.position_class
      FROM student_exam_results ser
      WHERE ser.exam_id = ?
    `).all(examId) as any[];
    
    const prevResults = db.prepare(`
      SELECT ser.student_id, ser.average as avg, ser.division, ser.position_class
      FROM student_exam_results ser
      WHERE ser.exam_id = ?
    `).all(prevExamId) as any[];
    
    const prevMap = new Map(prevResults.map((r: any) => [r.student_id, r]));
    
    const trends = currResults.map((cr: any) => {
      const pr = prevMap.get(cr.student_id);
      if (!pr) return { ...cr, prevAvg: null, avgChange: null, posChange: null, divChange: null };
      
      const avgChange = cr.avg - pr.avg;
      const posChange = pr.position_class - cr.position_class;
      const divChange = pr.division - cr.division;
      
      return {
        ...cr,
        prevAvg: pr.avg,
        avgChange: Math.round(avgChange * 100) / 100,
        posChange,
        divChange,
        trend: getTrendIcon(avgChange, 0)
      };
    }).filter((r: any) => r.prevAvg !== null);
    
    // Subject trends
    const currSubj = db.prepare(`
      SELECT sub.id, sub.name, sub.code, AVG(es.score) as avg_score
      FROM exam_scores es
      JOIN subjects sub ON es.subject_id = sub.id
      WHERE es.exam_id = ? AND es.absent = 0
      GROUP BY sub.id
    `).all(examId) as any[];
    
    const prevSubjMap = new Map(
      db.prepare(`
        SELECT sub.id, sub.name, sub.code, AVG(es.score) as avg_score
        FROM exam_scores es
        JOIN subjects sub ON es.subject_id = sub.id
        WHERE es.exam_id = ? AND es.absent = 0
        GROUP BY sub.id
      `).all(prevExamId).map((r: any) => [r.id, r])
    );
    
    const subjectTrends = currSubj.map((cs: any) => {
      const ps = prevSubjMap.get(cs.id);
      if (!ps) return { ...cs, prevAvg: null, change: null };
      const change = cs.avg_score - ps.avg_score;
      return { ...cs, prevAvg: ps.avg_score, change: Math.round(change * 100) / 100, trend: getTrendIcon(change, 0) };
    });
    
    res.json({ exam: currExam, prevExam, studentTrends: trends, subjectTrends });
  });

  // EXAM COMPARISON (Subject Teacher View)
  app.get("/api/exams/compare/subject/:subjectId", authenticateToken, (req, res) => {
    const subjectId = Number(req.params.subjectId);
    const { exam_ids } = req.query as any;
    
    if (!exam_ids) return res.status(400).json({ error: 'exam_ids required' });
    const ids = exam_ids.split(',').map((x: string) => Number(x)).filter((x: number) => Number.isFinite(x));
    
    if (ids.length === 0) return res.status(400).json({ error: 'Invalid exam_ids' });
    
    const exams = db.prepare(`SELECT id, name, type, form, academic_year, term FROM exams WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as any[];
    
    const subjectResults: any[] = [];
    for (const eid of ids) {
      const rows = db.prepare(`
        SELECT st.id, st.full_name, st.gender, es.score, es.absent
        FROM exam_scores es
        JOIN students st ON es.student_id = st.id
        WHERE es.exam_id = ? AND es.subject_id = ?
        ORDER BY es.score DESC
      `).all(eid, subjectId);
      subjectResults.push({ exam_id: eid, students: rows });
    }
    
    res.json({ exams, subjectResults });
  });

  // EXAM COMPARISON (Academic Office View)
  app.get("/api/exams/compare", authenticateToken, (req, res) => {
    const { exam_ids } = req.query as any;
    
    if (!exam_ids) return res.status(400).json({ error: 'exam_ids required' });
    const ids = exam_ids.split(',').map((x: string) => Number(x)).filter((x: number) => Number.isFinite(x));
    
    if (ids.length === 0) return res.status(400).json({ error: 'Invalid exam_ids' });
    
    const comparisons = ids.map(eid => {
      const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(eid) as any;
      const results = db.prepare(`
        SELECT 
          COUNT(*) as total_students,
          AVG(average) as mean_score,
          MAX(average) as max_score,
          MIN(average) as min_score,
          SUM(CASE WHEN division = 0 THEN 1 ELSE 0 END) as fail_count,
          SUM(CASE WHEN division > 0 THEN 1 ELSE 0 END) as pass_count
        FROM student_exam_results WHERE exam_id = ?
      `).get(eid) as any;
      
      const genderStats = db.prepare(`
        SELECT st.gender, COUNT(*) as count, AVG(ser.average) as avg
        FROM student_exam_results ser
        JOIN students st ON ser.student_id = st.id
        WHERE ser.exam_id = ?
        GROUP BY st.gender
      `).all(eid) as any[];
      
      return { exam, results: results || { total_students: 0, mean_score: 0 }, genderStats };
    });
    
    res.json(comparisons);
  });

  // COMPOSE EXAMS
  app.post("/api/exams/compose", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    
    const { name, form, academic_year, exam_weights } = req.body as any;
    if (!name || !form || !academic_year || !Array.isArray(exam_weights)) {
      return res.status(400).json({ error: 'name, form, academic_year, exam_weights required' });
    }
    
    const composition = JSON.stringify(exam_weights);
    const info = db.prepare(
      "INSERT INTO exam_compositions (name, form, academic_year, composition_json, created_by) VALUES (?, ?, ?, ?, ?)"
    ).run(name, form, academic_year, composition, user.id);
    
    // Mark source exams as composed
    for (const ew of exam_weights) {
      db.prepare("UPDATE exams SET is_composed = 1 WHERE id = ?").run(ew.exam_id);
    }
    
    res.json({ message: "Composition created", id: info.lastInsertRowid });
  });

  // GET COMPOSITIONS
  app.get("/api/exams/compositions", authenticateToken, (req, res) => {
    const { form, academic_year } = req.query as any;
    let query = "SELECT * FROM exam_compositions";
    const params: any[] = [];
    if (form) { query += " WHERE form = ?"; params.push(form); }
    if (academic_year) { query += params.length ? " AND academic_year = ?" : " WHERE academic_year = ?"; params.push(academic_year); }
    query += " ORDER BY id DESC";
    const rows = db.prepare(query).all(...params);
    res.json(rows.map((r: any) => ({ ...r, composition_json: JSON.parse(r.composition_json || '[]') })));
  });

  // PROCESS COMPOSED RESULTS
  app.post("/api/exams/compose/:id/process", authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'academic') return res.sendStatus(403);
    const compId = Number(req.params.id);
    
    const comp = db.prepare("SELECT * FROM exam_compositions WHERE id = ?").get(compId) as any;
    if (!comp) return res.status(404).json({ error: 'Composition not found' });
    
    const examWeights = JSON.parse(comp.composition_json || '[]') as any[];
    if (examWeights.length === 0) return res.status(400).json({ error: 'No exams in composition' });
    
    const exams = examWeights.map(ew => db.prepare("SELECT * FROM exams WHERE id = ?").get(ew.exam_id));
    const students = db.prepare(
      `SELECT DISTINCT st.id, st.full_name, st.gender, st.form, str.name as stream_name
       FROM students st
       LEFT JOIN streams str ON st.stream_id = str.id
       WHERE st.form = ? AND st.form != 'Graduated'
       ORDER BY st.full_name ASC`
    ).all(comp.form);
    
    const processComposed = db.transaction((studentList: any[]) => {
      for (const st of studentList) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        for (const ew of examWeights) {
          const ser = db.prepare(
            "SELECT average FROM student_exam_results WHERE exam_id = ? AND student_id = ?"
          ).get(ew.exam_id, st.id) as any;
          
          if (ser && ser.average !== null) {
            totalWeightedScore += ser.average * ew.weight;
            totalWeight += ew.weight;
          }
        }
        
        const finalAverage = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;
        const { grade, division, points, remark } = getGrade(finalAverage);
        
        db.prepare(`
          INSERT INTO student_exam_results (exam_id, student_id, total_marks, average, grade, division, points, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(exam_id, student_id)
          DO UPDATE SET total_marks = excluded.total_marks, average = excluded.average, grade = excluded.grade,
            division = excluded.division, points = excluded.points, remark = excluded.remark
        `).run(-compId, st.id, finalAverage * examWeights.length, finalAverage, grade, division, points, remark);
      }
    });
    
    processComposed(students);
    res.json({ message: "Composed results processed", students: students.length });
  });

  // Results (legacy support)
  app.get("/api/results", authenticateToken, (req, res) => {
    const { exam_id, subject_id, component } = req.query as any;
    const c = component === 'practical' ? 'practical' : 'theory';
    const results = db.prepare(`
      SELECT r.*, s.full_name as student_name 
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE r.exam_id = ? AND r.subject_id = ? AND r.component = ?
    `).all(exam_id, subject_id, c);
    res.json(results);
  });

  app.post("/api/results", authenticateToken, (req, res) => {
    const { student_id, exam_id, subject_id, score, component, absent } = req.body;
    const c = component === 'practical' ? 'practical' : 'theory';
    const isAbsent = absent ? 1 : 0;
    const normalizedScore = isAbsent ? null : score;
    db.prepare(`
      INSERT INTO results (student_id, exam_id, subject_id, component, score, absent)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, exam_id, subject_id, component)
      DO UPDATE SET score = excluded.score, absent = excluded.absent
    `).run(student_id, exam_id, subject_id, c, normalizedScore, isAbsent);
    res.json({ message: "Result saved" });
  });

  // Stats / Reports
  app.get("/api/reports/coverage", authenticateToken, (req, res) => {
    const coverage = db.prepare(`
      SELECT s.name as subject, s.form, 
             COUNT(t.id) as total_topics,
             SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_topics
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      GROUP BY s.id
    `).all();
    res.json(coverage);
  });

  // Reports (headmaster/academic)
  const requireReportingRole = (req: any, res: any) => {
    const actor = (req as any).user;
    if (actor.role !== 'headmaster' && actor.role !== 'academic') {
      res.sendStatus(403);
      return false;
    }
    return true;
  };

  // Teaching report: coverage by class/form and subject (plus assigned teacher)
  app.get('/api/reports/teaching', authenticateToken, (req, res) => {
    if (!requireReportingRole(req, res)) return;
    const { form } = req.query as any;
    const hasForm = typeof form === 'string' && form.trim().length > 0;

    const rows = db.prepare(`
      SELECT
        s.form,
        s.code,
        s.name as subject,
        COALESCE(u.full_name, '') as teacher,
        COUNT(t.id) as total_topics,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_topics,
        SUM(CASE WHEN t.status = 'on_progress' THEN 1 ELSE 0 END) as on_progress_topics,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending_topics,
        SUM(CASE WHEN t.tested = 1 THEN 1 ELSE 0 END) as tested_topics
      FROM subjects s
      LEFT JOIN topics t ON t.subject_id = s.id
      LEFT JOIN assignments a ON a.subject_id = s.id
      LEFT JOIN users u ON u.id = a.teacher_id
      ${hasForm ? 'WHERE s.form = ?' : ''}
      GROUP BY s.id, u.id
      ORDER BY s.form ASC, s.name ASC, u.full_name ASC
    `).all(hasForm ? [String(form)] : []) as any[];

    res.json(rows.map(r => ({
      form: r.form,
      code: r.code,
      subject: r.subject,
      teacher: r.teacher,
      total_topics: Number(r.total_topics ?? 0),
      completed_topics: Number(r.completed_topics ?? 0),
      on_progress_topics: Number(r.on_progress_topics ?? 0),
      pending_topics: Number(r.pending_topics ?? 0),
      tested_topics: Number(r.tested_topics ?? 0),
      coverage_percent: Number(r.total_topics ?? 0) > 0 ? Math.round((Number(r.completed_topics ?? 0) / Number(r.total_topics ?? 0)) * 1000) / 10 : 0,
    })));
  });

  // Exam report: per subject & component summary for an exam
  app.get('/api/reports/exams', authenticateToken, (req, res) => {
    if (!requireReportingRole(req, res)) return;
    const { exam_id } = req.query as any;
    const examId = Number(exam_id);
    if (!Number.isFinite(examId)) return res.status(400).json({ error: 'exam_id is required' });

    const exam = db.prepare('SELECT id, name, type, date FROM exams WHERE id = ?').get(examId) as any;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const rows = db.prepare(`
      SELECT
        s.form,
        s.code,
        s.name as subject,
        r.component,
        COUNT(1) as entries,
        SUM(CASE WHEN r.absent = 1 THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN r.absent = 0 THEN 1 ELSE 0 END) as present,
        AVG(CASE WHEN r.absent = 0 THEN r.score END) as mean_score,
        MIN(CASE WHEN r.absent = 0 THEN r.score END) as min_score,
        MAX(CASE WHEN r.absent = 0 THEN r.score END) as max_score
      FROM results r
      JOIN subjects s ON s.id = r.subject_id
      WHERE r.exam_id = ?
      GROUP BY s.id, r.component
      ORDER BY s.form ASC, s.name ASC, r.component ASC
    `).all(examId) as any[];

    res.json({
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        date: exam.date,
      },
      rows: rows.map(r => ({
        form: r.form,
        code: r.code,
        subject: r.subject,
        component: r.component,
        entries: Number(r.entries ?? 0),
        present: Number(r.present ?? 0),
        absent: Number(r.absent ?? 0),
        mean_score: r.mean_score === null || r.mean_score === undefined ? null : Math.round(Number(r.mean_score) * 100) / 100,
        min_score: r.min_score === null || r.min_score === undefined ? null : Number(r.min_score),
        max_score: r.max_score === null || r.max_score === undefined ? null : Number(r.max_score),
      })),
    });
  });

  // Students report
  app.get('/api/reports/students', authenticateToken, (req, res) => {
    if (!requireReportingRole(req, res)) return;
    const { form } = req.query as any;
    const hasForm = typeof form === 'string' && form.trim().length > 0;

    const rows = db.prepare(`
      SELECT
        st.id,
        st.full_name,
        st.gender,
        st.form,
        st.parent_phone,
        COALESCE(str.name, '') as stream,
        COUNT(sub.id) as stream_subject_count,
        GROUP_CONCAT(sub.code, ', ') as stream_subject_codes
      FROM students st
      LEFT JOIN streams str ON str.id = st.stream_id
      LEFT JOIN stream_subjects ss ON ss.stream_id = st.stream_id
      LEFT JOIN subjects sub ON sub.id = ss.subject_id
      ${hasForm ? 'WHERE st.form = ?' : ''}
      GROUP BY st.id
      ORDER BY st.form ASC, st.full_name ASC
    `).all(hasForm ? [String(form)] : []) as any[];

    res.json(rows.map(r => ({
      id: r.id,
      full_name: r.full_name,
      gender: r.gender,
      form: r.form,
      parent_phone: r.parent_phone || '',
      stream: r.stream || '',
      stream_subject_count: Number(r.stream_subject_count ?? 0),
      stream_subject_codes: r.stream_subject_codes || '',
    })));
  });

  // Teachers report (one or all)
  app.get('/api/reports/teachers', authenticateToken, (req, res) => {
    if (!requireReportingRole(req, res)) return;
    const { user_id } = req.query as any;
    const uid = user_id !== undefined && user_id !== null && String(user_id).trim() !== '' ? Number(user_id) : null;
    if (uid !== null && !Number.isFinite(uid)) return res.status(400).json({ error: 'Invalid user_id' });

    const rows = db.prepare(`
      SELECT
        u.id,
        u.full_name,
        u.role,
        u.email,
        u.phone,
        u.tsc_no,
        u.gender,
        u.education_level,
        u.studied_subjects,
        u.teaching_subjects,
        u.cheque_no,
        u.employment_date,
        u.confirmation_date,
        u.retirement_date,
        u.salary_scale,
        u.date_of_birth,
        u.nida_no,
        GROUP_CONCAT(s.code || ' ' || s.name, '; ') as assigned_subjects
      FROM users u
      LEFT JOIN assignments a ON a.teacher_id = u.id
      LEFT JOIN subjects s ON s.id = a.subject_id
      ${uid !== null ? 'WHERE u.id = ?' : ''}
      GROUP BY u.id
      ORDER BY u.role ASC, u.full_name ASC
    `).all(uid !== null ? [uid] : []) as any[];

    res.json(rows.map(r => ({
      id: r.id,
      full_name: r.full_name,
      role: r.role,
      email: r.email,
      phone: r.phone || '',
      tsc_no: r.tsc_no || '',
      gender: r.gender || '',
      education_level: r.education_level || '',
      studied_subjects: r.studied_subjects || '',
      teaching_subjects: r.teaching_subjects || '',
      cheque_no: r.cheque_no || '',
      employment_date: r.employment_date || '',
      confirmation_date: r.confirmation_date || '',
      retirement_date: r.retirement_date || '',
      salary_scale: r.salary_scale || '',
      date_of_birth: r.date_of_birth || '',
      nida_no: r.nida_no || '',
      assigned_subjects: r.assigned_subjects || '',
    })));
  });

  // Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
