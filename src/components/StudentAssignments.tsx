import React, { useEffect, useMemo, useState } from 'react';
import { Users, BookOpen, Save, Search } from 'lucide-react';
import { useToast } from './Toast';

interface Student {
  id: number;
  full_name: string;
  gender: string;
  form: string;
  stream: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  form: string;
  has_practical: boolean;
}

interface StudentAssignment {
  student_id: number;
  subject_id: number;
}

interface StudentAssignmentsProps {
  token: string;
}

export default function StudentAssignments({ token }: StudentAssignmentsProps) {
  const toast = useToast();
  const { showError, showSuccess } = toast;
  
  const [selectedForm, setSelectedForm] = useState<string>('Form 1');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<StudentAssignment[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
    fetchExistingAssignments();
  }, [selectedForm]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?form=${encodeURIComponent(selectedForm)}`, { headers });
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      setStudents([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects', { headers });
      const data = await res.json();
      const allSubjects = Array.isArray(data) ? data : [];
      setSubjects(allSubjects.filter(s => s.form === selectedForm));
    } catch (error) {
      setSubjects([]);
    }
  };

  const fetchExistingAssignments = async () => {
    try {
      const res = await fetch('/api/student-assignments', { headers });
      const data = await res.json();
      setExistingAssignments(Array.isArray(data) ? data : []);
      
      // Set initial selected assignments based on existing data
      const existing = new Set<string>();
      data.forEach((assignment: StudentAssignment) => {
        existing.add(`${assignment.student_id}-${assignment.subject_id}`);
      });
      setSelectedAssignments(existing);
    } catch (error) {
      setExistingAssignments([]);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(student => 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.stream.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const toggleAssignment = (studentId: number, subjectId: number) => {
    const key = `${studentId}-${subjectId}`;
    const newAssignments = new Set(selectedAssignments);
    
    if (newAssignments.has(key)) {
      newAssignments.delete(key);
    } else {
      newAssignments.add(key);
    }
    
    setSelectedAssignments(newAssignments);
  };

  const selectAllForSubject = (subjectId: number) => {
    const newAssignments = new Set(selectedAssignments);
    filteredStudents.forEach(student => {
      const key = `${student.id}-${subjectId}`;
      newAssignments.add(key);
    });
    setSelectedAssignments(newAssignments);
  };

  const clearAllForSubject = (subjectId: number) => {
    const newAssignments = new Set(selectedAssignments);
    filteredStudents.forEach(student => {
      const key = `${student.id}-${subjectId}`;
      newAssignments.delete(key);
    });
    setSelectedAssignments(newAssignments);
  };

  const saveAssignments = async () => {
    setLoading(true);
    try {
      const assignments = Array.from(selectedAssignments).map((key: string) => {
        const [studentId, subjectId] = key.split('-').map(Number);
        return { student_id: studentId, subject_id: subjectId };
      });

      const res = await fetch('/api/student-assignments', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments })
      });

      if (!res.ok) {
        throw new Error('Failed to save assignments');
      }

      showSuccess('Assignments saved successfully');
      fetchExistingAssignments();
    } catch (error) {
      showError('Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-brand-primary" />
            Student Subject Assignments
          </h2>
          <p className="text-sm text-slate-600 mt-1">Assign subjects to students by form</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            className="input-app py-2 !w-auto"
          >
            <option value="Form 1">Form 1</option>
            <option value="Form 2">Form 2</option>
            <option value="Form 3">Form 3</option>
            <option value="Form 4">Form 4</option>
          </select>
          
          <button
            onClick={saveAssignments}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search student name or stream..."
          className="input-app pl-9"
        />
      </div>

      {/* Assignment Table */}
      <div className="card-app overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest">
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Stream</th>
                {subjects.map(subject => (
                  <th key={subject.id} className="px-2 py-2 text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs font-bold text-slate-700 font-mono">{subject.code}</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => selectAllForSubject(subject.id)}
                          className="px-1 py-0.5 text-[8px] bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                          title="Select all students"
                        >
                          All
                        </button>
                        <button
                          onClick={() => clearAllForSubject(subject.id)}
                          className="px-1 py-0.5 text-[8px] bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                          title="Clear all students"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filteredStudents.map(student => (
                <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 font-semibold">{student.full_name}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                      {student.stream}
                    </span>
                  </td>
                  {subjects.map(subject => {
                    const isAssigned = selectedAssignments.has(`${student.id}-${subject.id}`);
                    return (
                      <td key={subject.id} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => toggleAssignment(student.id, subject.id)}
                          className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={subjects.length + 2} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                    {searchTerm ? 'No students match your search' : `No students found in ${selectedForm}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-slate-600">
              <strong>{filteredStudents.length}</strong> students in {selectedForm}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            <span className="text-slate-600">
              <strong>{subjects.length}</strong> subjects for {selectedForm}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brand-primary rounded"></div>
            <span className="text-slate-600">
              <strong>{selectedAssignments.size}</strong> total assignments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
