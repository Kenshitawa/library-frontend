# PRD: School Library and Textbook Management System

**Version:** 1.4 (draft)
**Client:** [School name]
**Status:** For build with Google Antigravity

---

## 1. Overview

A web-based system that lets a school library teacher manage its collection of textbooks and library books, assign and issue textbooks to learners and fellow teachers, track returns for each term or year, and produce reports on textbook availability and damaged or lost books. It replaces paper registers and spreadsheets with one searchable system used at the library desk.

The library teacher is the primary user. Learners and teachers are borrowers. Learners are usually issued textbooks for a whole term or year, and teachers can borrow textbooks and library books for shorter periods.

## 2. Goals

- Track every copy of every textbook and library book, including its location, condition, and who holds it.
- Issue textbooks to a single learner, a whole class, or a teacher in a few steps.
- Record the condition of each textbook at issue and at return, so damage and loss are easy to find and account for.
- Support end-of-term and end-of-year return drives, showing which learners and teachers still hold books.
- Give teachers a view of the textbooks assigned to their class or subject.
- Produce reports on textbook distribution, outstanding returns, and damaged or lost books.

## 3. Non-Goals (Version 1)

- E-books or digital content streaming
- Payment gateway integration (replacement fees are recorded and marked paid by staff)
- Sharing books between schools
- Native mobile apps (the web UI must be responsive, so it works on phones and tablets)
- Parent or guardian login (guardian contact details are stored, but guardians do not log in)
- Timetable or lesson planning

## 4. Users and Roles

| Role | Description | Key permissions |
|---|---|---|
| **Librarian** | The library teacher. Runs the whole system. | Everything: adds all users (learners, teachers, and staff logins), catalog and barcoded inventory, issuing and returns, reminders and calendar, charges and waivers, reports, deleting records, and all settings |
| **Teacher** | Teaching staff who borrow books and can log in | Own profile, own loans, search, and view textbooks assigned to their classes. Login created by the Librarian. |
| **Learner** | Student who is issued books | Stored as a borrower record and managed by the Librarian only. No login in version 1. |
| **Visitor** | Not logged in | Search the public catalog and view availability (Phase 6) |

## 5. Functional Requirements

### 5.1 Authentication and Access
- FR-1: The Librarian and teachers log in with email and password. Learners do not log in in version 1. Accounts are created by the Librarian, who sends an invite email so the new user sets their own password.
- FR-1a: The Librarian adds every user in the system: learners and teachers as borrower records, and teachers who need a login with a linked login account. The Librarian can edit, deactivate, and reset the login of any account.
- FR-1b: Every account creation, deactivation, and password reset is recorded in the audit log.
- FR-2: Role-based access control is enforced on both the UI and the API.
- FR-3: Passwords are hashed. Password reset is available by email.
- FR-4: Sessions expire after a configurable idle time (default 30 minutes for staff).

### 5.2 Catalog (Bibliographic Records)
- FR-5: Create, edit, and delete titles with: title, subtitle, authors (multiple), ISBN-10/13, publisher, publication year, edition, language, subject, grade or class level, description, cover image, and tags.
- FR-6: A title can have multiple physical copies. Each copy has its own record: barcode (unique), call number or shelf location, acquisition date, price, condition, and status.
- FR-7: Copy statuses: Available, Issued, Reserved, In Processing, Lost, Damaged, Withdrawn.
- FR-8: Optional ISBN lookup that auto-fills title and author details from a public book database. Staff can always enter details manually.
- FR-9: Bulk import of titles and copies from CSV, with a downloadable template and a preview step that reports errors before committing.
- FR-10: Cover images can be uploaded or left blank (a default placeholder is shown).
- FR-11: Deleting a title with copies currently issued is blocked. Withdrawing a copy keeps its history.
- FR-12: Textbooks are marked as textbooks, library books, or reference books. Reference books cannot be issued for home use.

### 5.3 Search
- FR-13: Keyword search across title, author, ISBN, subject, and tags, with partial matching.
- FR-14: Filters: subject, grade or class level, language, publication year range, availability, type (textbook, library book, reference), and location.
- FR-15: Results show availability (e.g., "3 of 5 copies available") and the shelf location.
- FR-16: Search results load in under 1 second for a catalog of 50,000 copies.

### 5.4 Borrowers (Learners and Teachers)
- FR-17: Create, edit, deactivate, and search borrowers. Learner fields: full name, admission number (unique, used as the borrower ID), class or grade, stream, date of birth (optional), guardian name, guardian phone, and notes. Teacher fields: full name, staff number, email, phone, subject department, and notes.
- FR-18: Borrower types are Learner and Teacher. Each type has its own issue rules, set in settings (see FR-47).
- FR-19: Learners can be grouped into classes. A class can be selected to issue books to all its learners at once.
- FR-20: Learners who leave the school are moved to Inactive status. Inactive borrowers cannot be issued books, but their history is kept. Learners with books still issued must return them or have them recorded as lost before deactivation.
- FR-21: Borrowers can be imported from CSV.
- FR-22: A year-end promotion action moves learners to the next class or grade in one step, without changing their existing issue history.

### 5.5 Issuing and Returns
- FR-23: **Issue to a learner:** Staff select the learner (or scan the learner's card or enter the admission number), then scan each book barcode. Each item shows its issue date, return date, and condition at issue.
- FR-24: **Issue to a class:** Staff select a class and a textbook title (or a list of titles for a subject set). The system issues one copy of each title to every learner in the class who does not already hold that title. Staff can review the list before confirming and can untick individual learners.
- FR-25: **Issue to a teacher:** Same as FR-23, using the teacher's record. Teachers have their own loan period, set in settings.
- FR-26: **Issue blocks:** Issuing is blocked when the borrower is inactive, when the borrower already holds the maximum number of items for their type, when the borrower has an overdue item, when the borrower has any unpaid lost or damaged charge (any amount, by default; threshold configurable), or when the copy is not Available or Reserved for that borrower. Reference books cannot be issued for home use. A borrower may still return items while blocked.
- FR-27: Blocked issues show the reason clearly. The Librarian can override a block, and the override is logged.
- FR-28: **Return date** is set from the borrower type or from a fixed term or year end date, depending on the setting. Year-long textbooks are due on the last school day of the year. Term-long textbooks are due at the end of the term. Library (non-textbook) books default to 14 days for learners and teachers, and the period is configurable.
- FR-29: **Condition at issue and return:** Each issue and return records the copy condition (Good, Fair, Poor, Damaged). Staff can add a short note and photo (optional) for damage.
- FR-30: **Return:** Staff scan the book barcode. The system closes the issue record, records the return condition, and flags any damage for replacement or repair charges.
- FR-31: **Bulk return:** Staff can select a class and return all its textbooks in one session, scanning each book. The screen shows which learners in the class still hold books.
- FR-32: **Return drive:** At the end of a term or year, the system shows a list of every borrower who still holds items, grouped by class, with counts and a printable version.
- FR-33: **Renewal:** A borrower can have a library book's return date extended for up to 2 renewals (default for both learners and teachers, configurable). Textbooks are not renewed; they are kept until the year or term end. Renewal is blocked if another borrower has reserved the title or the borrower has an overdue item.
- FR-34: **Reservations:** A borrower can reserve a title with no available copies. Reservations are queued in order. When a copy is returned, the first borrower in the queue is notified and has a configurable pickup window (default 3 days).
- FR-35: A borrower can cancel a reservation. Staff can cancel reservations on their behalf.
- FR-36: **Lost items:** Staff mark an issued copy as lost once it is more than 4 weeks overdue (configurable). This sets the copy to Lost and creates a replacement charge based on the copy price or a fixed fee from settings. Until the book is found or paid for, the borrower is blocked from new issues. If the borrower finds the book within a set window (default 4 weeks), staff can reverse the charge.
- FR-36a: **Replacement options:** For a lost or damaged book, the borrower may pay the charge or supply an identical replacement copy in the same format (for example, a hardcover for a hardcover). Staff record which option was used. Replacement copies are checked and then catalogued as a new copy.
- FR-36b: **Damage reporting window:** Damage not reported within 7 days of issue is charged to the borrower on return. Staff can change this window in settings.
- FR-36c: **In-library use:** Staff can record books used in the library (not taken home) so usage statistics count reading in the library as well as home loans.
- FR-36d: **Drop-box returns:** Returns can be logged later when a book is placed in a drop box. Staff check in the items in a batch, with the return date set to the drop date.
- FR-37: **Damaged items:** Staff record damage on return. A repair or replacement charge is created based on settings, and the copy is set to Damaged until repaired or withdrawn.
- FR-38: Overdue items show on the borrower's record and on the library dashboard.

### 5.6 Replacement Charges and Payments
- FR-39: Replacement charges are created for lost and damaged books. Overdue charges are optional and set per borrower type (default off for learners). Charges are paid to a Lost and Damaged Books account, and the money is used only to buy replacement copies.
- FR-40: The Librarian can record a payment (full or partial), waive a charge (with a reason), or adjust a charge (with a reason). All changes are logged.
- FR-41: A borrower's outstanding balance is shown on their profile and at issue time.
- FR-42: Receipts can be printed or saved as PDF for payments.

### 5.7 Teacher Portal
- FR-43: Teachers log in to see their current loans with return dates, reservations with status, outstanding charges, and their classes' textbook assignments.
- FR-44: Teachers can request a renewal or place or cancel a reservation from the portal, subject to the same rules as staff.
- FR-45: Teachers can update their own contact details. Changes to other fields go through staff.

### 5.8 Notifications
- FR-46: Email (and optionally SMS) notifications for: return date reminder (default 3 days before), overdue notice to teachers (default weekly until returned), reservation ready for pickup, and outstanding charge reminder. Learner notices go to the guardian contact if email or phone is recorded.
- FR-47: Each notification type can be turned on or off in settings. Templates are editable by the Librarian.
- FR-48: All sent notifications are logged with timestamp and delivery status.

### 5.9 Reports and Dashboard
- FR-49: **Dashboard:** Books issued today and returned today, overdue count, outstanding returns by class, active reservations, and borrowers with outstanding charges.
- FR-50: **Reports** (filterable by date range, class, borrower type, and subject, and exportable to CSV and PDF):
  - Textbook distribution by class and subject (copies issued vs. copies available)
  - Outstanding returns by class and by teacher
  - Lost and damaged items, with replacement charges
  - Condition trend for each title (how many copies came back in poor condition)
  - Most issued titles
  - Collection statistics (count by subject, type, language, and status)
  - Charges collected and outstanding
  - Borrower activity (new learners and teachers, inactive borrowers)
- FR-51: Staff can schedule a report to be emailed (optional for version 1).

### 5.10 Settings
- FR-52: School profile: name, address, contact details, logo, term dates.
- FR-53: Issue rules per borrower type: return period (fixed term or year end, or a number of days), maximum items held, renewal limit, and whether reservations are allowed.
- FR-54: Charge rules: replacement fee for lost books (fixed or copy price), processing fee (optional, for example a fee for covers and labels), repair fee for damage, overdue fee (optional), and the outstanding balance threshold for blocking issues. Overdue fees can be set per day or left off.
- FR-54a: Transfer rule: a learner who transfers within the same school group keeps their unpaid charges, and the charge follows the learner's record.
- FR-55: Notification settings and templates.
- FR-56: Locations and shelves (e.g., Main Library, Staff Room, Reference Shelu×NzæÚ$z{-®éÜj×€€Üµ™Õ±°…ÁÁ•…É…¹”µ¹½¹”É½Õ¹‘•µ‰ÕÑÑ½¸‰½É‘•È‰½É‘•ÈµÍ±…Ñ”´ÌÀÀ‰œµİ¡¥Ñ”Áà´ÌÁä´ÈÁÈ´äÑ•áĞµÍ´Ñ•áĞµÍ±…Ñ”´äÀÀÑÉ…¹Í¥Ñ¥½¸µ½±½ÉÌœ°(€€€€€€€€€€€€€€™½ÕÌé‰½É‘•ÈµÁÉ¥µ…Éä™½ÕÌé½ÕÑ±¥¹”µ¹½¹”™½ÕÌéÉ¥¹œ´È™½ÕÌéÉ¥¹œµÁÉ¥µ…Éä¼ÈÀœ°(€€€€€€€€€€€€€€‘¥Í…‰±•éÕÉÍ½Èµ¹½Ğµ…±±½İ•‘¥Í…‰±•é‰œµÍ±…Ñ”´ÄÀÀ‘¥Í…‰±•éÑ•áĞµÍ±…Ñ”´ĞÀÀœ°(€€€€€€€€€€€€€€‘…É¬é‰½É‘•ÈµlŒĞÀÔàÑ…t‘…É¬é‰œµlŒÄĞÈÈÅ‰t‘…É¬éÑ•áĞµl˜Á˜Õ•™tœ°(€€€€€€€€€€€€€€‘…É¬é™½ÕÌé‰½É‘•ÈµlŒàÑÅ„İt‘…É¬é™½ÕÌéÉ¥¹œµlŒàÑÅ„İt¼ÈÀœ°(€€€€€€€€€€€€€€‘…É¬é‘¥Í…‰±•é‰œµlŒÈÀÉ˜Èİt‘…É¬é‘¥Í…‰±•éÑ•áĞµlŒäÅ„ÈäÙtœ°(€€€€€€€€€€€€€•ÉÉ½È€˜˜€‰½É‘•Èµ‘…¹•È™½ÕÌé‰½É‘•Èµ‘…¹•È™½ÕÌéÉ¥¹œµ‘…¹•È¼ÈÀœ°(€€€€€€€€€€€€€±…ÍÍ9…µ”(€€€€€€€€€€€€¥ô(€€€€€€€€€€€ì¸¸¹ÁÉ½ÁÍô(€€€€€€€€€€ø(€€€€€€€€€€€íÁ±…•¡½±‘•È€˜˜€ (€€€€€€€€€€€€€€ñ½ÁÑ¥½¸Ù…±Õ”ôˆˆ‘¥Í…‰±•ø(€€€€€€€€€€€€€€€íÁ±…•¡½±‘•Éô(€€€€€€€€€€€€€€ğ½½ÁÑ¥½¸ø(€€€€€€€€€€€€¥ô(€€€€€€€€€€€í½ÁÑ¥½¹Ì¹µ…À ¡½ÁÑ¥½¸¤€ôø€ (€€€€€€€€€€€€€€ñ½ÁÑ¥½¸(€€€€€€€€€€€€€€€­•äõí½ÁÑ¥½¸¹Ù…±Õ•ô(€€€€€€€€€€€€€€€Ù…±Õ”õí½ÁÑ¥½¸¹Ù…±Õ•ô(€€€€€€€€€€€€€€€‘¥Í…‰±•õí½ÁÑ¥½¸¹‘¥Í…‰±•‘ô(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€í½ÁÑ¥½¸¹±…‰•±ô(€€€€€€€€€€€€€€ğ½½ÁÑ¥½¸ø(€€€€€€€€€€€€¤¥ô(€€€€€€€€€€ğ½Í•±•Ğø((€€€€€€€€€€ñ¡•ÙÉ½¹½İ¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”É¥¡Ğ´Ì ´ĞÜ´ĞÁ½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”Ñ•áĞµÍ±…Ñ”´ĞÀÀˆ€¼ø(€€€€€€€€ğ½‘¥Øø((€€€€€€€í‘•ÍÉ¥ÁÑ¥½¸€˜˜€…•ÉÉ½È€˜˜€ (€€€€€€€€€€ñÀ¥õí‘•Í%‘ô±…ÍÍ9…µ”ô‰Ñ•áĞµáÌÑ•áĞµÍ±…Ñ”´ÔÀÀ‘…É¬éÑ•áĞµÍ±…Ñ”´ĞÀÀˆø(€€€€€€€€€€€í‘•ÍÉ¥ÁÑ¥½¹ô(€€€€€€€€€€ğ½Àø(€€€€€€€€¥ô((€€€€€€€í•ÉÉ½È€˜˜€ (€€€€€€€€€€ñÀ¥õí•ÉÉ½É%‘ô±…ÍÍ9…µ”ô‰Ñ•áĞµáÌ™½¹Ğµµ•‘¥Õ´Ñ•áĞµ‘…¹•Èˆø(€€€€€€€€€€€í•ÉÉ½Éô(€€€€€€€€€€ğ½Àø(€€€€€€€€¥ô(€€€€€€ğ½‘¥Øø(€€€€¤(€ô(¤()M•±•Ğ¹‘¥ÍÁ±…å9…µ”€ô€M•±•Ğœ(