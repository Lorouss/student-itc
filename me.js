// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAE1DljqYJ8PvG1TPhHmdpfbt5R_9g2UhY",
  authDomain: "itc-me.firebaseapp.com",
  databaseURL: "https://itc-me-default-rtdb.firebaseio.com",
  projectId: "itc-me",
  storageBucket: "itc-me.firebasestorage.app",
  messagingSenderId: "886913167195",
  appId: "1:886913167195:web:15e1d358859bf07d60f47e",
  measurementId: "G-TL87WZ6XEK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class StudentManager {
    constructor() {
        this.students = [];
        this.currentStudentId = null;
        this.loadStudents();
    }

    async loadStudents() {
        try {
            const snapshot = await db.collection('students').get();
            this.students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.updateAllStatistics();
            this.showAllStudents();
        } catch (error) {
            console.error("Error loading students: ", error);
            alert('حدث خطأ في تحميل بيانات الطلاب');
        }
    }

    async saveStudents() {
        try {
            // Update all students in Firebase
            const batch = db.batch();
            this.students.forEach(student => {
                const studentRef = db.collection('students').doc(student.id);
                batch.set(studentRef, {
                    name: student.name,
                    attendances: student.attendances,
                    projects: student.projects,
                    totalPoints: student.totalPoints
                });
            });
            await batch.commit();
            
            this.updateAllStatistics();
        } catch (error) {
            console.error("Error saving students: ", error);
            alert('حدث خطأ في حفظ بيانات الطلاب');
        }
    }

    updateAllStatistics() {
        this.updateTotalStudentsCount();
        this.updateTopStudentsRanking();
        this.updateMostAttendanceRanking();
    }

    updateTotalStudentsCount() {
        const totalStudentsElement = document.getElementById('totalStudentsCount');
        totalStudentsElement.textContent = this.students.length;
    }

    updateTopStudentsRanking() {
        const topStudentsElement = document.getElementById('topStudentsRanking');
        const topStudentsFullList = document.getElementById('topStudentsFullList');
        
        const topStudents = [...this.students]
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);

        topStudentsElement.textContent = topStudents.length;

        topStudentsFullList.innerHTML = this.students
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((student, index) => `
            <div class="list-item">
                <span>${index + 1}. ${student.name} <span class="badge">${student.totalPoints} نقطة</span></span>
                <div>
                    <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                    <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                </div>
            </div>
        `).join('') || '<p>لا يوجد طلاب</p>';
    }

    updateMostAttendanceRanking() {
        const mostAttendanceElement = document.getElementById('mostAttendanceRanking');
        const mostAttendanceFullList = document.getElementById('mostAttendanceFullList');
        
        const mostAttendanceStudents = [...this.students]
            .sort((a, b) => b.attendances.length - a.attendances.length)
            .slice(0, 5);

        mostAttendanceElement.textContent = mostAttendanceStudents.length;

        mostAttendanceFullList.innerHTML = this.students
            .sort((a, b) => b.attendances.length - a.attendances.length)
            .map((student, index) => `
            <div class="list-item">
                <span>${index + 1}. ${student.name} <span class="badge">${student.attendances.length} يوم حضور</span></span>
                <div>
                    <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                    <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                </div>
            </div>
        `).join('') || '<p>لا يوجد حضورات</p>';
    }

    hideAllListSections() {
        const sections = [
            'totalStudentsList', 
            'topStudentsFullList', 
            'mostAttendanceFullList', 
            'searchResultsList'
        ];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });
    }

    showAllStudents() {
        this.hideAllListSections();
        const totalStudentsList = document.getElementById('totalStudentsList');
        totalStudentsList.innerHTML = this.students.length > 0 
            ? this.students.map(student => `
                <div class="list-item">
                    <span>${student.name}</span>
                    <div>
                        <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                        <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                    </div>
                </div>
            `).join('') 
            : '<p>لا يوجد طلاب</p>';
        
        totalStudentsList.style.display = 'block';
    }

    async addStudent(name) {
        name = name || document.getElementById('studentName').value.trim();

        if (!name) {
            alert('الرجاء إدخال اسم الطالب');
            return false;
        }

        if (this.students.some(s => s.name === name)) {
            alert('هذا الطالب موجود بالفعل');
            return false;
        }

        const newStudent = {
            name: name,
            attendances: [],
            projects: [],
            totalPoints: 0
        };

        try {
            const docRef = await db.collection('students').add(newStudent);
            newStudent.id = docRef.id;
            this.students.push(newStudent);
            
            document.getElementById('studentName').value = '';
            this.showAllStudents();
            this.updateAllStatistics();
            return true;
        } catch (error) {
            console.error("Error adding student: ", error);
            alert('حدث خطأ في إضافة الطالب');
            return false;
        }
    }

    async deleteStudent(studentId) {
        if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

        try {
            // Delete from Firestore
            await db.collection('students').doc(studentId).delete();
            
            // Remove from local array
            this.students = this.students.filter(s => s.id !== studentId);
            
            this.showAllStudents();
            this.updateAllStatistics();
        } catch (error) {
            console.error("Error deleting student: ", error);
            alert('حدث خطأ في حذف الطالب');
        }
    }

    async clearAllStudents() {
        if (!confirm('هل أنت متأكد من مسح جميع الطلاب؟')) return;

        try {
            // Delete all students from Firestore
            const batch = db.batch();
            this.students.forEach(student => {
                const studentRef = db.collection('students').doc(student.id);
                batch.delete(studentRef);
            });
            await batch.commit();

            // Clear local array
            this.students = [];
            this.showAllStudents();
            this.updateAllStatistics();
        } catch (error) {
            console.error("Error clearing students: ", error);
            alert('حدث خطأ في مسح جميع الطلاب');
        }
    }

    showStudentDetails(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        this.currentStudentId = studentId;

        const detailsContent = document.getElementById('studentDetailsContent');
        detailsContent.innerHTML = `
            <h3>الحضور:</h3>
            <ul>
                ${student.attendances.map((attendance, index) => `
                    <li>
                        ${attendance} 
                        <span class="action-btn" onclick="studentManager.removeAttendance(${index})">❌</span>
                    </li>
                `).join('') || 'لا يوجد حضور'}
            </ul>

            <h3>المشاريع:</h3>
            <ul>
                ${student.projects.map((project, index) => `
                    <li>
                        <strong>${project.title}</strong> (${project.date})
                        <span class="action-btn" onclick="studentManager.removeProject(${index})">❌</span>
                    </li>
                `).join('') || 'لا يوجد مشاريع'}
            </ul>

            <p>إجمالي النقاط: ${student.totalPoints} نقطة</p>
        `;

        const modalStudentName = document.getElementById('modalStudentName');
        modalStudentName.textContent = `تفاصيل الطالب: ${student.name}`;

        const modal = document.getElementById('studentDetailsModal');
        modal.style.display = 'block';
    }

    async addAttendance() {
        const attendanceDate = document.getElementById('attendanceDate').value;
        if (!attendanceDate || !this.currentStudentId) {
            alert('الرجاء اختيار تاريخ حضور');
            return;
        }

        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        // تجنب إضافة تاريخ مكرر
        if (student.attendances.includes(attendanceDate)) {
            alert('تم إضافة هذا التاريخ من قبل');
            return;
        }

        try {
            student.attendances.push(attendanceDate);
            student.totalPoints += 1;
            
            // Update student in Firestore
            await db.collection('students').doc(student.id).update({
                attendances: student.attendances,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);
            document.getElementById('attendanceDate').value = '';
        } catch (error) {
            console.error("Error adding attendance: ", error);
            alert('حدث خطأ في إضافة الحضور');
        }
    }

    async removeAttendance(index) {
        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        try {
            student.attendances.splice(index, 1);
            student.totalPoints = Math.max(0, student.totalPoints - 1);

            // Update student in Firestore
            await db.collection('students').doc(student.id).update({
                attendances: student.attendances,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);
        } catch (error) {
            console.error("Error removing attendance: ", error);
            alert('حدث خطأ في إزالة الحضور');
        }
    }

    async addProject() {
        const projectTitle = document.getElementById('projectTitle').value.trim();
        const projectDate = document.getElementById('projectDate').value;

        if (!projectTitle || !projectDate) {
            alert('الرجاء إدخال عنوان المشروع وتاريخه');
            return;
        }

        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        const newProject = {
            title: projectTitle,
            date: projectDate,
        };

        try {
            student.projects.push(newProject);
            student.totalPoints += 2; // منح نقطتين للمشروع

            // Update student in Firestore
            await db.collection('students').doc(student.id).update({
                projects: student.projects,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);

            // مسح الحقول بعد الإضافة
            document.getElementById('projectTitle').value = '';
            document.getElementById('projectDate').value = '';
        } catch (error) {
            console.error("Error adding project: ", error);
            alert('حدث خطأ في إضافة المشروع');
        }
    }

    async removeProject(index) {
        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        try {
            student.projects.splice(index, 1);
            student.totalPoints = Math.max(0, student.totalPoints - 2);

            // Update student in Firestore
            await db.collection('students').doc(student.id).update({
                projects: student.projects,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);
        } catch (error) {
            console.error("Error removing project: ", error);
            alert('حدث خطأ في إزالة المشروع');
        }
    }

    searchStudents() {
        const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
        const searchResultsList = document.getElementById('searchResultsList');

        // إخفاء القوائم الأخرى
        this.hideAllListSections();

        if (!searchTerm) {
            this.showAllStudents();
            return;
        }

        const filteredStudents = this.students.filter(student => 
            student.name.toLowerCase().includes(searchTerm)
        );

        searchResultsList.innerHTML = filteredStudents.length > 0
            ? filteredStudents.map(student => `
                <div class="list-item">
                    <span>${student.name}</span>
                    <div>
                        <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                        <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                    </div>
                </div>
            `).join('')
            : '<p>لا توجد نتائج بحث</p>';

        searchResultsList.style.display = 'block';
    }
}

// إنشاء مثيل لإدارة الطلاب
const studentManager = new StudentManager();

// دالة إغلاق النافذة المنبثقة
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'none';
    }

    // دالة تبديل عرض الأقسام
    function toggleSection(sectionType) {
        const totalStudentsList = document.getElementById('totalStudentsList');
        const topStudentsFullList = document.getElementById('topStudentsFullList');
        const mostAttendanceFullList = document.getElementById('mostAttendanceFullList');

        // إخفاء جميع القوائم أولاً
        totalStudentsList.style.display = 'none';
        topStudentsFullList.style.display = 'none';
        mostAttendanceFullList.style.display = 'none';

        // عرض القائمة المطلوبة
        switch(sectionType) {
            case 'totalStudents':
                totalStudentsList.style.display = 'block';
                break;
            case 'topStudents':
                topStudentsFullList.style.display = 'block';
                break;
            case 'mostAttendance':
                mostAttendanceFullList.style.display = 'block';
                break;
        }
    }
    function handleEnterKeyAddStudent(event) {
    // التحقق مما إذا كان المفتاح المضغوط هو Enter (كود المفتاح 13)
    if (event.keyCode === 13 || event.which === 13) {
        studentManager.addStudent();
    }
}