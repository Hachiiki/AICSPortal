# AICS Portal — Core Pseudocode

---

## Auth
```
login(email, password):
    user = findUser(email)
    if not user or not verify(password, user.hash): fail
    if user.status != "active": fail
    token = signJWT({sub:user.id, role:user.role, branch:user.branchId})
    setCookie(token); return {user, redirect: "/portal/"+user.branchId+"/"+user.role}

faceLogin(faceImage, branchId):
    live = faceAPI.embed(faceImage)
    for user in users(branchId, hasEmbedding=true):
        if distance(live, user.embedding) < 0.6:
            return loginAs(user)  // convenience only, password is primary
    fail → fallback to password
```

---

## Branch Scoping (every query)
```
query(collection, filter):
    return db[collection].find({...filter, branchId: currentUser.branchId})
```

---

## Student Dashboard
```
getGrades(studentId, term):
    for each enrollment in enrollments(studentId, term):
        subject = getSubject(enrollment.subjectId)
        g = getGradeRecords(enrollment.id)
        final = round(0.3*g.prelim + 0.3*g.midterm + 0.4*g.finals)
        yield {subject, units, teacher, prelim:g.p, mid:g.m, fin:g.f, final, remark(final)}

getSchedule(studentId, term):
    grid[6 days][8..16hrs] = empty
    for each active enrollment:
        for each class in section.schedule:
            grid[day][hour] = {subject, room, teacher}  // mark conflicts
    return grid

todaysClasses(studentId):
    today = grid[dayOfWeek()][currentHour..]
    return {current, upcoming, past}
```

---

## Teacher Grading
```
submitGrades(teacherId, sectionId, subjectId, period, entries):
    verify teacher owns section/subject
    if any grade locked: fail "contact admin"
    bulk upsert grades {enrollmentId, period, value, by:teacherId}
    lock all grades for (section, subject, period)
    auditLog("GRADE_SUBMIT", teacherId, entries)
    notifyStudents(entries, "grade posted")
```

---

## Admin
```
branchOverview(branchId):
    return {
        students: count(users, role=student, active),
        teachers: count(users, role=teacher, active),
        classes: count(sections, active, currentTerm),
        rooms: count(rooms, available),
        pendingRequests, pendingDocs,
        recent: auditLogs(limit=10)
    }

createStudent(branchId, data):
    user = createUser({...data, role:"student", branchId, hash:hash(tempPass)})
    autoEnroll(user, curriculum(course, year))
    auditLog("STUDENT_CREATE", adminId, user.id)
    return {userId, tempPassword}
```

---

## Enrollment
```
enrollSubject(studentId, subjectId):
    if not enrollmentOpen(branch): fail
    if prereqsNotMet(student, subject): fail
    if hasConflict(student.schedule + subject): fail
    if subject.full: fail
    createEnrollment(studentId, subjectId, currentTerm)
```

---

## COE PDF
```
generateCOE(studentId):
    student, enrollments = fetch...
    pdf = new PDF()
    pdf.text("CERTIFICATE OF ENROLLMENT")
    pdf.text(student.name, student.id, course, branch, term)
    pdf.table(enrollments → code, name, units)
    pdf.text("Total: " + sum(units))
    pdf.signatureLine(); pdf.date()
    return pdf.blob()
```

---

## Audit Log (all sensitive actions)
```
log(action, actor, target, meta, oldVal, newVal):
    create audit_logs {action, actorId, actorRole, branchId, targetType, targetId,
        previousValue:oldVal, newValue:newVal, meta, ip, ua, time:now()}
```

---

## Error Pattern
```
try: return {ok:true, data: op()}
catch ValidationError: return {ok:false, code:"VALIDATION", msg}
catch NotFound: return {ok:false, code:"NOT_FOUND"}
catch Unauthorized: return {ok:false, code:"UNAUTHORIZED"}
catch Duplicate: return {ok:false, code:"DUPLICATE"}
catch *: log(err); return {ok:false, code:"INTERNAL"}
```

---