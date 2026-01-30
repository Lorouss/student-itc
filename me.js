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
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في تحميل بيانات الطلاب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            })
        }
    }

    async saveStudents() {
        try {
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
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في حفظ بيانات الطلاب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            })
        }
    }
    
    async resetAllPoints() {
        const result = await Swal.fire({
            title: "هل انت متأكد ؟",
            text: "سيتم تصفير جميع نقاط الطلاب",
            icon: "warning",
            iconHtml: '<i class="fa-regular fa-address-card"></i>',
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#f44336",
            cancelButtonText: "لا",
            confirmButtonText: "تأكيد"
        });
    
        if (!result.isConfirmed) return;
    
        try {
            const batch = db.batch();
            this.students.forEach(student => {
                student.totalPoints = 0;
                student.attendances = [];
                student.projects = [];
                const studentRef = db.collection('students').doc(student.id);
                batch.update(studentRef, { 
                    totalPoints: 0,
                    attendances: [],
                    projects: []
                });
            });
            await batch.commit();
            
            this.updateAllStatistics();
            if (this.currentStudentId) {
                this.showStudentDetails(this.currentStudentId);
            }

            await Swal.fire({
                title: "تم التصفير!",
                text: "تم تصفير جميع نقاط الطلاب بنجاح.",
                icon: "success",
                showConfirmButton: false,
                timer: 1700,
            })
        } catch (error) {
            console.error("Error resetting data: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في تصفير بيانات الطلاب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            })
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
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="member-checkbox" data-student-id="${student.id}" data-rank="${index + 1}" data-name="${student.name}" data-points="${student.totalPoints}" onchange="updateSelectedMembersCount()">
                    <span>${index + 1}. ${student.name} <span class="badge">${student.totalPoints} نقطة</span></span>
                </div>
                <div>
                    <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                    <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                    <span class="action-btn" onclick="studentManager.editStudentName('${student.id}')">✏️</span>
                </div>
            </div>
        `).join('') || '<p>لا يوجد طلاب</p>';
    }

    updateMostAttendanceRanking() {
        const mostAttendanceElement = document.getElementById('mostAttendanceRanking');
        const mostAttendanceFullList = document.getElementById('mostAttendanceFullList');
        
        const mostAttendanceStudents = [...this.students]
            .sort((a, b) => a.totalPoints - b.totalPoints)
            .slice(0, 5);
        mostAttendanceElement.textContent = mostAttendanceStudents.length;

        mostAttendanceFullList.innerHTML = this.students
            .sort((a, b) => a.totalPoints - b.totalPoints)
            .map((student, index) => `
            <div class="list-item">
                <span>${index + 1}. ${student.name} <span class="badge">${student.attendances.length} مشاركة </span></span>
                <div>
                    <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                    <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                    <span class="action-btn" onclick="studentManager.editStudentName('${student.id}')">✏️</span>
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

        const sortedStudents = [...this.students].sort((a, b) => a.name.localeCompare(b.name));

        totalStudentsList.innerHTML = sortedStudents.length > 0 
        ? sortedStudents.map(student => `
            <div class="list-item">
                <span>${student.name}</span>
                <div>
                    <span class="action-btn" onclick="studentManager.showStudentDetails('${student.id}')">🔍</span>
                    <span class="action-btn" onclick="studentManager.deleteStudent('${student.id}')">❌</span>
                    <span class="action-btn" onclick="studentManager.editStudentName('${student.id}')">✏️</span>
                </div>
            </div>
        `).join('')
        : '<p>لا يوجد طلاب</p>';

        totalStudentsList.style.display = 'block';
    }

    async addStudent() {
        const studentName = document.getElementById('studentName').value.trim();

        if (!studentName) {
            Swal.fire({
                title: "أدخل اسم الطالب",
                icon: "info",
                iconHtml: '<i class="fa-solid fa-user"></i>',
                showConfirmButton: false,
                timer: 1800,
                showClass: {
                    popup: `
                        animate__animated
                        animate__fadeInUp
                        animate__faster
                    `
                },
                hideClass: {
                    popup: `
                        animate__animated
                        animate__fadeOutDown
                        animate__faster
                    `
                },
                customClass: {
                    popup: 'custom-padding'    
                }
            });
            return;
        }

        try {
            const docRef = await db.collection('students').add({
                name: studentName,
                attendances: [],
                projects: [],
                totalPoints: 0
            });

            await this.loadStudents();
            document.getElementById('studentName').value = '';

            Swal.fire({
                title: "تم!",
                text: "تمت إضافة الطالب بنجاح.",
                icon: "success",
                showConfirmButton: false,
                timer: 1700,
                showClass: {
                    popup: `
                        animate__animated
                        animate__fadeInUp
                        animate__faster
                    `
                },
                hideClass: {
                    popup: `
                        animate__animated
                        animate__fadeOutDown
                        animate__faster
                    `
                }
            });
        } catch (error) {
            console.error("Error adding student: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في إضافة الطالب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async deleteStudent(studentId) {
        const result = await Swal.fire({
            title: "هل أنت متأكد؟",
            text: "سيتم حذف الطالب نهائيًا!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#f44336",
            cancelButtonText: "لا",
            confirmButtonText: "تأكيد"
        });
    
        if (!result.isConfirmed) return;

        try {
            await db.collection('students').doc(studentId).delete();
            await this.loadStudents();

            await Swal.fire({
                title: "تم الحذف!",
                text: "تم حذف الطالب بنجاح.",
                icon: "success",
                showConfirmButton: false,
                timer: 1700,
            })
        } catch (error) {
            console.error("Error deleting student: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في حذف الطالب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async clearAllStudents() {
        const result = await Swal.fire({
            title: "هل أنت متأكد؟",
            text: "سيتم حذف جميع الطلاب نهائيًا!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#f44336",
            cancelButtonText: "لا",
            confirmButtonText: "تأكيد"
        });
    
        if (!result.isConfirmed) return;

        try {
            const batch = db.batch();
            this.students.forEach(student => {
                const studentRef = db.collection('students').doc(student.id);
                batch.delete(studentRef);
            });
            await batch.commit();
            await this.loadStudents();

            await Swal.fire({
                title: "تم الحذف!",
                text: "تم حذف جميع الطلاب بنجاح.",
                icon: "success",
                showConfirmButton: false,
                timer: 1700,
            })
        } catch (error) {
            console.error("Error clearing all students: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في حذف الطلاب",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async editStudentName(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        const result = await Swal.fire({
            title: "تعديل اسم الطالب",
            input: "text",
            inputValue: student.name,
            inputPlaceholder: "أدخل الاسم الجديد",
            showCancelButton: true,
            confirmButtonText: "تأكيد",
            cancelButtonText: "إلغاء",
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#f44336",
            inputValidator: (value) => {
                if (!value) {
                    return "يجب إدخال اسم!";
                }
            },
            showClass: {
                popup: `
                    animate__animated
                    animate__fadeInUp
                    animate__faster
                `
            },
            hideClass: {
                popup: `
                    animate__animated
                    animate__fadeOutDown
                    animate__faster
                `
            }
        });

        if (result.isConfirmed && result.value) {
            const newName = result.value.trim();

            try {
                student.name = newName;
                await db.collection('students').doc(studentId).update({ name: newName });
                this.updateAllStatistics();
                this.showAllStudents();

                Swal.fire({
                    title: "تم!",
                    text: "تم تعديل اسم الطالب بنجاح.",
                    icon: "success",
                    showConfirmButton: false,
                    timer: 1700,
                });
            } catch (error) {
                console.error("Error updating student name: ", error);
                swal.fire({
                    position: "center",
                    title: "حدث خطأ",
                    text: "نواجه مشكلة في تعديل اسم الطالب",
                    icon: "error",
                    showConfirmButton: false,
                    timer: 3000,
                });
            }
        }
    }

    showStudentDetails(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        this.currentStudentId = studentId;
        const modal = document.getElementById('studentDetailsModal');
        const modalContent = document.getElementById('studentDetailsContent');

        const modalStudentName = document.getElementById('modalStudentName');
        modalStudentName.textContent = student.name;

        const totalAttendancePoints = student.attendances.length;
        const totalProjectPoints = student.projects.length * 2;

        let detailsHTML = `
            <div>
                <h3 class="point-font">مجموع النقاط: <span class="highlight">${student.totalPoints}</span></h3>
                <p><strong class="point-font">نقاط الحضور:</strong> <span class="highlight">${totalAttendancePoints}</span></p>
                <p><strong class="point-font">نقاط المشاريع:</strong> <span class="highlight">${totalProjectPoints}</span></p>
            </div>
        `;

        detailsHTML += '<div><h3>الحضورات</h3>';
        if (student.attendances.length > 0) {
            student.attendances.forEach((att, index) => {
                detailsHTML += `
                    <div class="list-item">
                        <span>${att}</span>
                        <span class="action-btn" onclick="studentManager.removeAttendance(${index})">❌</span>
                    </div>`;
            });
        } else {
            detailsHTML += '<p>لا توجد حضورات</p>';
        }
        detailsHTML += '</div>';

        detailsHTML += '<div><h3>المشاريع</h3>';
        if (student.projects.length > 0) {
            student.projects.forEach((proj, index) => {
                detailsHTML += `
                    <div class="list-item">
                        <div>
                            <div><strong>${proj.title}</strong></div>
                            <div style="font-size: 12px; color: #888;">${proj.date}</div>
                        </div>
                        <span class="action-btn" onclick="studentManager.removeProject(${index})">❌</span>
                    </div>`;
            });
        } else {
            detailsHTML += '<p>لا توجد مشاريع</p>';
        }
        detailsHTML += '</div>';

        modalContent.innerHTML = detailsHTML;
        modal.style.display = 'flex';
    }

    async addAttendance() {
        const attendanceDate = document.getElementById('attendanceDate').value;
        
        if (!attendanceDate) {
            Swal.fire({
                title: "أختر تاريخ الحضور",
                icon: "info",
                iconHtml: '<i class="fa-solid fa-calendar-days"></i>',
                showConfirmButton: false,
                timer: 1800,
                showClass: {
                    popup: `
                        animate__animated
                        animate__fadeInUp
                        animate__faster
                    `
                },
                hideClass: {
                    popup: `
                        animate__animated
                        animate__fadeOutDown
                        animate__faster
                    `
                },
                customClass: {
                    popup: 'custom-padding'    
                }
            });
            return;
        }

        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        try {
            student.attendances.push(attendanceDate);
            student.totalPoints += 1;

            await db.collection('students').doc(student.id).update({
                attendances: student.attendances,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);

            document.getElementById('attendanceDate').value = '';
        } catch (error) {
            console.error("Error adding attendance: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في إضافة الحضور",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async removeAttendance(index) {
        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        try {
            student.attendances.splice(index, 1);
            student.totalPoints = Math.max(0, student.totalPoints - 1);

            await db.collection('students').doc(student.id).update({
                attendances: student.attendances,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);
        } catch (error) {
            console.error("Error removing attendance: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في إزالة الحضور",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async addProject() {
        const projectTitle = document.getElementById('projectTitle').value.trim();
        const projectDate = document.getElementById('projectDate').value;

        if (!projectTitle || !projectDate) {
            Swal.fire({
                title: "أدخل عنوان المشروع و تاريخه",
                icon: "info",
                iconHtml: '<i class="fa-solid fa-diagram-project"></i>',
                showConfirmButton: false,
                timer: 1800,
                showClass: {
                    popup: `
                        animate__animated
                        animate__fadeInUp
                        animate__faster
                    `
                },
                hideClass: {
                    popup: `
                        animate__animated
                        animate__fadeOutDown
                        animate__faster
                    `
                },
                customClass: {
                    popup: 'custom-padding'    
                }
            });
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
            student.totalPoints += 2;

            await db.collection('students').doc(student.id).update({
                projects: student.projects,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);

            document.getElementById('projectTitle').value = '';
            document.getElementById('projectDate').value = '';
        } catch (error) {
            console.error("Error adding project: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في إضافة المشروع",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    async removeProject(index) {
        const student = this.students.find(s => s.id === this.currentStudentId);
        if (!student) return;

        try {
            student.projects.splice(index, 1);
            student.totalPoints = Math.max(0, student.totalPoints - 2);

            await db.collection('students').doc(student.id).update({
                projects: student.projects,
                totalPoints: student.totalPoints
            });

            this.updateAllStatistics();
            this.showStudentDetails(this.currentStudentId);
        } catch (error) {
            console.error("Error removing project: ", error);
            swal.fire({
                position: "center",
                title: "حدث خطأ",
                text: "نواجه مشكلة في إزالة المشروع",
                icon: "error",
                showConfirmButton: false,
                timer: 3000,
            });
        }
    }

    searchStudents() {
        const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
        const searchResultsList = document.getElementById('searchResultsList');

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
                        <span class="action-btn" onclick="studentManager.editStudentName('${student.id}')">✏️</span>
                    </div>
                </div>
            `).join('')
            : '<p>لا توجد نتائج بحث</p>';

        searchResultsList.style.display = 'block';
    }
}

const studentManager = new StudentManager();

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

function toggleSection(sectionType) {
    const totalStudentsList = document.getElementById('totalStudentsList');
    const topStudentsFullList = document.getElementById('topStudentsFullList');
    const mostAttendanceFullList = document.getElementById('mostAttendanceFullList');
    const csvControls = document.getElementById('csvControls');

    totalStudentsList.style.display = 'none';
    topStudentsFullList.style.display = 'none';
    mostAttendanceFullList.style.display = 'none';
    csvControls.style.display = 'none';

    switch(sectionType) {
        case 'totalStudents':
            totalStudentsList.style.display = 'block';
            break;
        case 'topStudents':
            topStudentsFullList.style.display = 'block';
            csvControls.style.display = 'flex';
            updateSelectedMembersCount();
            break;
        case 'mostAttendance':
            mostAttendanceFullList.style.display = 'block';
            break;
    }
}

function handleEnterKeyAddStudent(event) {
    if (event.keyCode === 13 || event.which === 13) {
        studentManager.addStudent();
    }
}

function selectAllMembers() {
    const checkboxes = document.querySelectorAll('.member-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.closest('.list-item').classList.add('selected');
    });
    updateSelectedMembersCount();
}

function deselectAllMembers() {
    const checkboxes = document.querySelectorAll('.member-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.list-item').classList.remove('selected');
    });
    updateSelectedMembersCount();
}

function updateSelectedMembersCount() {
    const checkboxes = document.querySelectorAll('.member-checkbox:checked');
    const count = checkboxes.length;
    const selectedCountElement = document.getElementById('selectedCount');
    const downloadBtn = document.getElementById('downloadCsvBtn');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = `المحدد: ${count}`;
    }
    
    if (downloadBtn) {
        downloadBtn.disabled = count === 0;
    }

    document.querySelectorAll('.member-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.closest('.list-item').classList.add('selected');
        } else {
            checkbox.closest('.list-item').classList.remove('selected');
        }
    });
}

function downloadMembersCSV() {
    const checkboxes = document.querySelectorAll('.member-checkbox:checked');
    
    if (checkboxes.length === 0) {
        Swal.fire({
            title: "تنبيه!",
            text: "الرجاء تحديد عضو واحد على الأقل",
            icon: "warning",
            showConfirmButton: false,
            timer: 1800,
        });
        return;
    }

    let csvContent = '\ufeff';
    csvContent += 'class,full name,point\n';

    const selectedMembers = [];
    checkboxes.forEach(checkbox => {
        const rank = checkbox.dataset.rank;
        const name = checkbox.dataset.name;
        const points = checkbox.dataset.points;
        
        selectedMembers.push({ rank: parseInt(rank), name, points: parseInt(points) });
    });

    selectedMembers.sort((a, b) => a.rank - b.rank);

    selectedMembers.forEach(member => {
        csvContent += `${member.rank},"${member.name}",${member.points}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `Pepole.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    wal.fire({
        title: "تم الحفظ",
        text: "تم حفظ الاشخاص",
        icon: "success",
        showConfirmButton: false,
        timer: 1700,
    });
}

function toggleTheme() {
    const themeStylesheet = document.getElementById('theme-stylesheet');
    const themeIcon = document.getElementById('theme-icon');
    const logo = document.querySelector('.logo img');

    if (themeStylesheet.getAttribute('href') === 'light.css') {
        themeStylesheet.setAttribute('href', 'dark.css');
        themeIcon.setAttribute('src', 'icon/sun.svg');
        logo.setAttribute('src', 'icon/logo_dark.svg');
        localStorage.setItem('site-theme', 'dark');
    } else {
        themeStylesheet.setAttribute('href', 'light.css');
        themeIcon.setAttribute('src', 'icon/moon.svg');
        logo.setAttribute('src', 'icon/logo_light.svg');
        localStorage.setItem('site-theme', 'light');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('site-theme');
    const themeStylesheet = document.getElementById('theme-stylesheet');
    const themeIcon = document.getElementById('theme-icon');
    const logo = document.querySelector('.logo img');

    if (savedTheme === 'light') {
        themeStylesheet.setAttribute('href', 'light.css');
        themeIcon.setAttribute('src', 'icon/moon.svg');
        logo.setAttribute('src', 'icon/logo_light.svg');
        localStorage.setItem('site-theme', 'light'); 
    } else{
        themeStylesheet.setAttribute('href', 'dark.css');
        themeIcon.setAttribute('src', 'icon/sun.svg');
        logo.setAttribute('src', 'icon/logo_dark.svg');
    }
});
