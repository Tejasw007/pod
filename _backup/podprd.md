# PrintPod — Updated PRD

## 1. Product Overview

**PrintPod** is a self-service campus printing ecosystem that allows students to upload documents, configure printing options, pay online, and securely collect their prints from a physical PrintPod.

The system consists of **two separate portals**:

### Portal 1 — Student / Customer Portal

Used by students on their personal devices to:

* Register/login
* Upload documents
* Select print options
* Make payment
* View their print order
* Access their QR/code
* Connect to a nearby PrintPod
* Confirm the document before printing
* View print status

### Portal 2 — PrintPod Portal

Runs on the screen/display of every physical PrintPod.

The PrintPod:

* Displays a large QR code
* Provides a 5-digit fallback code
* Detects/identifies connected student devices
* Retrieves the student's paid print order
* Shows the document and print configuration
* Asks for confirmation
* Sends the job to the physical printer
* Shows printing status
* Completes and locks the order after successful printing

---

# 2. Updated Student Journey

The complete user experience should be extremely simple:

```text
Student uploads document
        ↓
Selects print options
        ↓
Pays
        ↓
Order becomes READY
        ↓
Student goes to PrintPod
        ↓
Scans QR displayed on PrintPod
        ↓
Phone automatically opens/connects to PrintPod session
        ↓
Student's order appears
        ↓
Student confirms
        ↓
PrintPod prints
        ↓
PRINT COMPLETE
```

### Fallback

If QR scanning doesn't work:

```text
PrintPod displays:

Enter 5-digit code

[ _ _ _ _ _ ]

Student enters code
        ↓
Backend identifies order
        ↓
Student's document appears
        ↓
Student confirms
        ↓
Printing begins
```

---

# 3. PrintPod QR System

The QR displayed on the **PrintPod screen** is the primary method of connecting a student to the pod.

The QR must be:

* Large
* Clearly visible
* High contrast
* Extremely fast to scan
* Easy to access from the student's phone
* Automatically refreshed when necessary

### Example

The PrintPod screen displays:

```text
┌─────────────────────────────┐
│                             │
│       CONNECT TO POD        │
│                             │
│        ███████████          │
│        ██ QR CODE ██        │
│        ███████████          │
│                             │
│       Scan with phone       │
│                             │
│      OR ENTER CODE          │
│                             │
│          48291              │
│                             │
└─────────────────────────────┘
```

---

# 4. QR → Instant Pod Connection

The QR should NOT contain the student's document.

Instead, the QR identifies the **specific PrintPod session**.

Example:

```text
QR
 ↓
POD-003
 ↓
Secure session
 ↓
Student phone connects
```

The student's phone then communicates with the backend to determine which eligible print order belongs to that student.

The QR should use a secure, short-lived session token.

---

# 5. "Lightning Fast" QR Experience

The QR connection should be optimized for speed.

Target:

> **Scan → Open connection page → Identify student → Show order in approximately 1–2 seconds under normal network conditions.**

Avoid unnecessary steps.

### Desired flow

```text
SCAN QR
   ↓
Instantly open PrintPod connection
   ↓
Authenticate student session
   ↓
Find READY_FOR_PRINT order
   ↓
Show document
```

Do NOT make the student:

* Enter the pod number manually
* Enter their order ID
* Search through orders
* Enter their email
* Re-upload the document
* Enter payment information again

The QR should do the pod identification automatically.

---

# 6. Student Device Connection

When a student scans the PrintPod QR:

```text
Student Phone
      ↓
PrintPod QR
      ↓
Secure Pod Session
      ↓
Backend
      ↓
Find Student's READY order
      ↓
Return order
```

The student's browser should then show:

```text
Connected to:

PrintPod #03
Library Block

Your Print Order

assignment.pdf

5 pages
2 copies
A4
B&W
Double-sided

₹10

[ CONFIRM & PRINT ]
```

---

# 7. Important Order Matching Logic

The system must NEVER simply show every order associated with a pod.

It must verify:

```text
Student Identity
        +
Pod Session
        +
Paid Order
        +
READY_FOR_PRINT
```

Only then should the order be displayed.

Example:

```text
Student A scans Pod #03

Backend checks:

Is Student A authenticated? ✓

Does Student A have a paid order? ✓

Is the order ready? ✓

Is the order already printed? ✗

Is the QR/session valid? ✓

→ Show order
```

---

# 8. 5-Digit Fallback Code

Every READY print order receives a short **5-digit pickup code**.

Example:

```text
48291
```

The code should be:

* Randomly generated
* Difficult to guess
* Short enough to type quickly
* Valid only for the relevant print session/order
* Invalid after successful printing
* Rate-limited to prevent brute-force attempts

### Fallback Flow

```text
Student cannot scan QR
        ↓
Looks at pod screen
        ↓
Selects "Enter Code"
        ↓
Types 48291
        ↓
Backend validates code
        ↓
Order found
        ↓
Document shown on student's phone
        ↓
Student confirms
        ↓
Print
```

---

# 9. Student Confirmation

The system must **NOT immediately print merely because the QR/code was scanned.**

After successful connection, the student's phone should show a confirmation screen.

Example:

```text
┌───────────────────────────┐
│      READY TO PRINT       │
│                           │
│  assignment.pdf           │
│                           │
│  5 Pages                  │
│  2 Copies                 │
│  A4                       │
│  Black & White            │
│  Double-sided             │
│                           │
│  Total: ₹10               │
│                           │
│  [ CONFIRM & PRINT ]      │
│                           │
└───────────────────────────┘
```

Only after the student presses:

**CONFIRM & PRINT**

should the backend authorize the PrintPod to start printing.

---

# 10. PrintPod Portal

Every PrintPod has its own dedicated kiosk interface.

### Default Screen

```text
PRINTPOD

Scan to connect

[ LARGE QR CODE ]

or

Enter 5-digit code

[ _ _ _ _ _ ]

Status: READY
```

### Connecting

```text
Connecting...

Please wait.
```

### Order Found

```text
ORDER FOUND ✓

Please confirm the print
on your phone.

Waiting for confirmation...
```

### Printing

```text
PRINTING...

2 / 2 COPIES

Please do not remove
the paper.
```

### Complete

```text
PRINT COMPLETE ✓

Please collect your documents.

Thank you for using PrintPod!

Returning to home...
```

---

# 11. Real-Time Communication

The Student Portal and PrintPod Portal should communicate in real time.

Preferred architecture:

```text
Student Phone
      │
      │
      ▼
   Backend
      │
      │ WebSocket / SSE
      ▼
  PrintPod
```

For example:

```text
Student presses:

CONFIRM & PRINT
        ↓
Backend
        ↓
PrintPod receives:
START_PRINT
        ↓
Printer starts
```

The student should simultaneously see:

```text
Printing...
```

and the PrintPod should show:

```text
Printing...
```

---

# 12. Print Job State Machine

Use a strict state machine:

```text
CREATED
   ↓
PAYMENT_PENDING
   ↓
PAID
   ↓
READY_FOR_PRINT
   ↓
POD_CONNECTED
   ↓
AWAITING_CONFIRMATION
   ↓
PRINTING
   ↓
PRINTED
```

Failure states:

```text
PAYMENT_FAILED
CANCELLED
EXPIRED
PRINT_FAILED
```

Never allow an already printed order to return to:

```text
READY_FOR_PRINT
```

---

# 13. QR Security

The QR displayed by the PrintPod should contain a **short-lived secure pod-session token**, not:

* Student information
* Document URL
* Database credentials
* Permanent storage URL
* Payment information

Example concept:

```text
Pod #03
     ↓
Session Token
     ↓
QR
```

The backend validates the token before creating the connection.

QR/session tokens should periodically refresh.

---

# 14. Student Order QR vs PrintPod QR

There are now **two different QR concepts**.

### PrintPod QR — Primary

Displayed physically on the PrintPod.

Purpose:

> Connect the student's phone to that PrintPod.

```text
PRINTPOD → QR → STUDENT PHONE
```

### Optional Order QR — Secondary

The student's own order page can still contain an order QR.

Purpose:

> Fallback identification of a specific order.

```text
STUDENT ORDER → QR → PRINTPOD
```

However, the **PrintPod-displayed QR should be the primary UX** because it eliminates the need for students to find/open their order QR.

---

# 15. Recommended Fastest UX

The ideal experience should be:

### Before reaching pod

Student already has:

```text
PAID
READY FOR PRINT
```

### At pod

```text
SCAN QR
   ↓
Phone connects
   ↓
Order appears
   ↓
CONFIRM
   ↓
PRINT
```

No additional login should be required if the student is already authenticated in the browser/app.

If authentication is required, use the student's existing session rather than asking them to log in again.

---

# 16. Updated Security Requirements

The system must verify:

```text
Authenticated Student
+
Valid Pod Session
+
Paid Order
+
Order Belongs To Student
+
Order Is READY_FOR_PRINT
+
Order Has Not Already Been Printed
```

before printing.

For the 5-digit code:

* Rate-limit attempts
* Temporarily lock after repeated failed attempts
* Never reveal whether a guessed code belongs to another student
* Expire unused codes
* Invalidate the code after successful printing

---

# 17. Final Architecture

```text
                    ┌─────────────────────┐
                    │   STUDENT PORTAL    │
                    │                     │
                    │ Upload              │
                    │ Configure           │
                    │ Pay                 │
                    │ View Orders         │
                    │ Confirm Print       │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │    PRINTPOD API     │
                    │                     │
                    │ Auth                │
                    │ Orders              │
                    │ Payments            │
                    │ QR Sessions         │
                    │ Print Jobs          │
                    └───────┬───────┬─────┘
                            │       │
                    WebSocket/SSE   │
                            │       │
                            ▼       ▼
                  ┌────────────┐  ┌────────────┐
                  │  POD #001  │  │  POD #002  │
                  │            │  │            │
                  │ QR Screen  │  │ QR Screen  │
                  │ 5-digit    │  │ 5-digit    │
                  │ code       │  │ code       │
                  └─────┬──────┘  └─────┬──────┘
                        │                │
                        ▼                ▼
                    🖨 Printer        🖨 Printer
```

---

# 18. Updated Core Product Statement

> **PrintPod is a two-portal, cloud-connected self-service printing system where students upload and pay for documents online, then connect to a physical PrintPod by scanning the pod's QR code or entering a 5-digit fallback code. The student's document and print settings are securely retrieved, displayed on their device for confirmation, and automatically sent to the connected printer.**

---

# 19. MVP Success Scenario

The final MVP should successfully demonstrate:

```text
STUDENT PORTAL

Login
 ↓
Upload assignment.pdf
 ↓
Select:
A4
B&W
2 copies
Duplex
 ↓
Pay
 ↓
READY FOR PRINT
```

Student walks to the pod.

```text
PRINTPOD PORTAL

QR displayed
+
5-digit fallback code displayed
```

Student scans QR.

```text
PHONE

Connected to PrintPod #03 ✓

assignment.pdf
5 pages
2 copies
A4
B&W
Duplex

₹10

[ CONFIRM & PRINT ]
```

Student confirms.

```text
PRINTPOD

PRINTING...
     ↓
PRINT COMPLETE ✓
```

Backend:

```text
Order Status:

READY_FOR_PRINT
       ↓
POD_CONNECTED
       ↓
AWAITING_CONFIRMATION
       ↓
PRINTING
       ↓
PRINTED
```

The same QR/code cannot be used to print the document again.

---

# 20. Post-Print File Cleanup

Once a print order reaches the **PRINTED** state, the uploaded document file must be **permanently deleted** from storage.

```text
PRINTING
   ↓
PRINTED
   ↓
DELETE uploaded file from storage
```

Requirements:

* Deletion must happen automatically after successful printing
* The file must be removed from all storage locations (cloud storage, any cached copies)
* The order metadata (filename, page count, settings, payment info) should be retained for records — only the actual file content is deleted
* If deletion fails, the system should retry and log the failure for manual cleanup
* Students should not be able to re-download or re-print using the same order
