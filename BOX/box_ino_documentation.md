# Box.ino System Documentation

## Serial Commands (Server → Arduino)

### Mode Control Commands

| Command       | Condition                            | Action                            |
| ------------- | ------------------------------------ | --------------------------------- |
| `ready`       | Anytime                              | Responds with "MODE_READY"        |
| `pen1`        | Logged in, unlocked, no mode running | Enters Pen1 Mode (colorful dots)  |
| `pen2`        | Logged in, unlocked, no mode running | Enters Pen2 Mode (spiral pattern) |
| `erasing_pen` | Logged in, unlocked, no mode running | Enters Erasing Pen Mode           |
| `writing`     | Logged in, unlocked, no mode running | Enters Writing/Drawing Mode       |
| `erasing`     | Logged in, unlocked, no mode running | Enters Erasing Mode               |
| `screenshot`  | Logged in, unlocked, no mode running | Enters Screenshot Mode            |

### Mode Exit Commands

| Command            | Condition           | Action                                   |
| ------------------ | ------------------- | ---------------------------------------- |
| `exit_pen1`        | In Pen1 Mode        | Exits Pen1 Mode → returns to menu        |
| `exit_pen2`        | In Pen2 Mode        | Exits Pen2 Mode → returns to menu        |
| `exit_erasing_pen` | In Erasing Pen Mode | Exits Erasing Pen Mode → returns to menu |
| `exit_writing`     | In Writing Mode     | Exits Writing Mode → returns to menu     |
| `exit_erasing`     | In Erasing Mode     | Exits Erasing Mode → returns to menu     |
| `exit_screenshot`  | In Screenshot Mode  | Exits Screenshot Mode → returns to menu  |

### System Control Commands

| Command       | Condition | Action                                                      |
| ------------- | --------- | ----------------------------------------------------------- |
| `exiting`     | Anytime   | Logs out user completely, returns to RFID screen            |
| `locked`      | Anytime   | Forces logout, shows lock animation, returns to RFID screen |
| `queue_empty` | Logged in | Shows queue empty animation, only when no mode is running   |

### Command Rules & Restrictions

| Rule                 | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| **Locked System**    | All commands ignored when system is locked                                       |
| **Not Logged In**    | All commands except `ready` ignored when not logged in                           |
| **Mode Running**     | Cannot start new mode while another mode is active (except exit/logout commands) |
| **Valid Exits Only** | Exit commands only work for their specific mode                                  |

---

## Status Messages (Arduino → Server)

### Login & Authentication Status

| Status               | Trigger                       | Context                                               |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| `LOGIN_OK`           | Successful password entry (#) | User authenticated, enters mode menu                  |
| `LOGIN_FAIL`         | Wrong password attempt        | Attempt counter incremented                           |
| `MaxAttemptAccessed` | 3rd failed password attempt   | System locks for 30 seconds                           |
| `LOGOUT`             | User logs out                 | Via keypad '3' (page 2) or `exiting`/`locked` command |

### System State Status

| Status              | Trigger                           | Context                         |
| ------------------- | --------------------------------- | ------------------------------- |
| `MODE_READY`        | Mode completed or `ready` command | System ready for next command   |
| `SLEEP`             | 30 seconds of inactivity          | Screen turns off, system sleeps |
| `IDLE`              | Wake from sleep                   | Keypress detected during sleep  |
| `QUEUE_EMPTY_SHOWN` | Queue empty animation displayed   | Response to `queue_empty` cmd   |

### Mode Activation Status

| Status               | Trigger                  | Context                                          |
| -------------------- | ------------------------ | ------------------------------------------------ |
| `MODE_PEN1`          | Pen1 mode started        | Via keypad '1' or `pen1` command                 |
| `MODE_PEN2`          | Pen2 mode started        | Via keypad '2' or `pen2` command                 |
| `MODE_ERASING_PEN`   | Erasing Pen mode started | Via keypad '3' (page 1) or `erasing_pen` command |
| `MODE_WRITING`       | Writing mode started     | Via keypad '4' or `writing` command              |
| `MODE_ERASING`       | Erasing mode started     | Via keypad '5' or `erasing` command              |
| `SCREENSHOT_REQUEST` | Screenshot mode started  | Via keypad '6' or `screenshot` command           |

---

## Operating Modes

### Mode 1: Pen1 (Bouncing Dots)

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| **Activation**  | Keypad: `1` (page 1) / Serial: `pen1`                        |
| **Function**    | Draws cyan dots bouncing horizontally back and forth         |
| **Colors**      | Cyan                                                         |
| **Pattern**     | Horizontal bouncing, y-position increments when x reverses   |
| **RGB Effect**  | None (simplified mode)                                       |
| **Exit Method** | Keypad: `#` OR Server: `exit_pen1`                           |
| **Keypad Exit** | ✅ Enabled                                                   |
| **Status Sent** | `MODE_PEN1` (start), `MODE_READY` NOT sent (no explicit end) |

### Mode 2: Pen2 (Spiral Pattern)

| Property        | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| **Activation**  | Keypad: `2` (page 1) / Serial: `pen2`                        |
| **Function**    | Draws circular spiral patterns with expanding radius         |
| **Pattern**     | Continuous spiral, radius expands 5-60 pixels then resets    |
| **Color**       | Magenta                                                      |
| **RGB Effect**  | None (simplified mode)                                       |
| **Exit Method** | Keypad: `#` OR Server: `exit_pen2`                           |
| **Keypad Exit** | ✅ Enabled                                                   |
| **Status Sent** | `MODE_PEN2` (start), `MODE_READY` NOT sent (no explicit end) |

### Mode 3: Erasing Pen

| Property        | Value                                                 |
| --------------- | ----------------------------------------------------- |
| **Activation**  | Keypad: `3` (page 1) / Serial: `erasing_pen`          |
| **Function**    | Erases with red rounded rectangle moving horizontally |
| **Pattern**     | Horizontal sweep with red rounded rectangle outlines  |
| **RGB Effect**  | None (simplified mode)                                |
| **Exit Method** | Keypad: `#` OR Server: `exit_erasing_pen`             |
| **Keypad Exit** | ✅ Enabled                                            |
| **Status Sent** | `MODE_ERASING_PEN` (start), `MODE_READY` NOT sent     |

### Mode 4: Writing/Drawing

| Property        | Value                                      |
| --------------- | ------------------------------------------ |
| **Activation**  | Keypad: `4` (page 2) / Serial: `writing`   |
| **Function**    | Draws cyan horizontal lines                |
| **Pattern**     | Progressive horizontal line drawing        |
| **Color**       | Cyan                                       |
| **RGB Effect**  | Writing effect (color cycling, 15ms speed) |
| **Display**     | Shows "Drawing Mode" title and exit hint   |
| **Exit Method** | Keypad: `#` OR Server: `exit_writing`      |
| **Keypad Exit** | ✅ Enabled                                 |
| **Status Sent** | `MODE_WRITING` (start), `MODE_READY` (end) |

### Mode 5: Erasing

| Property        | Value                                      |
| --------------- | ------------------------------------------ |
| **Activation**  | Keypad: `5` (page 2) / Serial: `erasing`   |
| **Function**    | Red erasing effect moving horizontally     |
| **Pattern**     | Red rectangles sweeping across screen      |
| **RGB Effect**  | Erasing effect (blue pulsing, 20ms speed)  |
| **Display**     | Shows "Erasing Mode" title and exit hint   |
| **Exit Method** | Keypad: `#` OR Server: `exit_erasing`      |
| **Keypad Exit** | ✅ Enabled                                 |
| **Status Sent** | `MODE_ERASING` (start), `MODE_READY` (end) |

### Mode 6: Screenshot

| Property        | Value                                                |
| --------------- | ---------------------------------------------------- |
| **Activation**  | Keypad: `6` (page 2) / Serial: `screenshot`          |
| **Function**    | Camera flash animation effect                        |
| **Visual**      | Camera icon with flash effect on screen              |
| **LED Flash**   | 3x white LED pulses (RGB 255,255,255)                |
| **RGB Effect**  | White flash effect                                   |
| **Display**     | Shows "Screenshot" title, camera icon, and exit hint |
| **Exit Method** | Server command `exit_screenshot` ONLY                |
| **Keypad Exit** | ❌ Disabled                                          |
| **Status Sent** | `SCREENSHOT_REQUEST` (start), `MODE_READY` (end)     |

---

## System States & Login Flow

### Login Stages

| Stage              | Display               | Valid Input             | Next Stage                                   |
| ------------------ | --------------------- | ----------------------- | -------------------------------------------- |
| **WAIT_RFID**      | "TAP CARD" animation  | RFID card scan          | ENTER_PASSWORD (if authorized)               |
| **ENTER_PASSWORD** | Password entry screen | Keypad 0-9, \*, #       | Mode Menu (if correct) / Locked (if 3 fails) |
| **Mode Menu**      | 2-page mode selection | Keys 1-6, A, B, 3(exit) | Selected Mode                                |
| **Active Mode**    | Mode-specific screen  | Mode-specific controls  | Mode Menu (on exit)                          |
| **Locked**         | Lock screen + timer   | Wait 30 seconds         | WAIT_RFID                                    |
| **Sleep**          | Screen off            | Any keypress            | WAIT_RFID (wake up)                          |

### State Transition Diagram

```
[WAIT_RFID] ─(authorized card)→ [ENTER_PASSWORD]
                                        │
                                  (correct pwd)
                                        ↓
                                  [Mode Menu]
                                        │
                                  (select mode)
                                        ↓
                                  [Active Mode]
                                        │
                                  (exit / #)
                                        ↓
                                  [Mode Menu] ─(3 or exiting)→ [WAIT_RFID]
                                        │
                                  (30s timeout)
                                        ↓
                                     [Sleep]
```

---

## Audio Feedback (DFPlayer)

| Track # | Event                 | Volume | Context                       |
| ------- | --------------------- | ------ | ----------------------------- |
| 1       | System startup        | 23     | Power on / begin()            |
| 2       | Access denied         | 23-25  | Wrong RFID card detected      |
| 2       | Password incorrect    | 23     | Failed password attempt       |
| 3       | Access granted (RFID) | 25     | Authorized RFID card detected |
| 3       | Password correct      | 23     | Successful login              |
| 4       | Key press             | 25     | Any key during password entry |
| 6       | System locked         | 23     | Max attempts reached          |

---

## Security Configuration

| Parameter              | Value              | Description                          |
| ---------------------- | ------------------ | ------------------------------------ |
| **Password**           | `1234`             | Hardcoded password                   |
| **Authorized UID**     | `82 ED 17 02`      | Valid RFID card UID (4 bytes)        |
| **Max Attempts**       | 3                  | Failed password attempts before lock |
| **Lock Duration**      | 30,000 ms (30 sec) | Lockout time after max attempts      |
| **Inactivity Timeout** | 30,000 ms (30 sec) | Time before sleep mode               |
| **Keypad Debounce**    | 200 ms             | Debounce delay for keypad            |

### Authentication Flow

1. ✅ **RFID Scan** → Must match `82 ED 17 02`
2. ✅ **Password Entry** → Must be `1234`
3. ✅ **Both Required** → Sequential authentication

---

## Keypad Controls

### Password Entry Stage

| Key   | Action                           |
| ----- | -------------------------------- |
| `0-9` | Append digit to password         |
| `*`   | Clear password input             |
| `#`   | Submit password for verification |

### Mode Menu - Page 1

| Key | Action                 |
| --- | ---------------------- |
| `1` | Enter Pen1 Mode        |
| `2` | Enter Pen2 Mode        |
| `3` | Enter Erasing Pen Mode |
| `A` | Next page (→ Page 2)   |
| `D` | **EXIT** (logout)      |

### Mode Menu - Page 2

| Key | Action                     |
| --- | -------------------------- |
| `4` | Enter Writing/Drawing Mode |
| `5` | Enter Erasing Mode         |
| `6` | Enter Screenshot Mode      |
| `B` | Previous page (← Page 1)   |
| `D` | **EXIT** (logout)          |

### Inside Modes

| Mode        | Key | Action                       |
| ----------- | --- | ---------------------------- |
| Writing     | `#` | Exit mode                    |
| Erasing     | `#` | Exit mode                    |
| Pen1        | `#` | Exit mode (returns to menu)  |
| Pen2        | `#` | Exit mode (returns to menu)  |
| Erasing Pen | `#` | Exit mode (returns to menu)  |
| Screenshot  | -   | No keypad exit (server only) |

---

## Hardware Configuration

### Display (ST7789 TFT)

| Pin            | Function          |
| -------------- | ----------------- |
| 10             | CS (Chip Select)  |
| 9              | DC (Data/Command) |
| 8              | RST (Reset)       |
| **Resolution** | 240x320 pixels    |
| **Rotation**   | 1 (landscape)     |

### RGB LED

| Pin | Color |
| --- | ----- |
| 11  | Red   |
| 12  | Green |
| 13  | Blue  |

### Ultrasonic Sensor (HC-SR04)

| Pin | Function |
| --- | -------- |
| 2   | TRIG     |
| 3   | ECHO     |

### RFID Reader (MFRC522)

| Pin | Function          |
| --- | ----------------- |
| 53  | SS (Slave Select) |
| 7   | RST (Reset)       |

### Keypad (4x4 Matrix)

| Type | Pins           |
| ---- | -------------- |
| Rows | 31, 33, 35, 37 |
| Cols | 30, 32, 34, 36 |

### DFPlayer Mini

| Serial        | Pins                      |
| ------------- | ------------------------- |
| Serial1       | Hardware Serial (TX1/RX1) |
| **Baud Rate** | 9600                      |

---

## RGB LED Effects

| Effect Name | Mode                 | Pattern                             | Speed                           |
| ----------- | -------------------- | ----------------------------------- | ------------------------------- |
| `writing`   | Writing, Pen1, Pen2  | Red→Yellow→Blue→Green→Magenta cycle | 25ms (default), 10-15ms (modes) |
| `erasing`   | Erasing, Erasing Pen | Blue fade in/out                    | 20ms (default), 15ms (modes)    |
| `exit`      | Logout               | Red fade in/out                     | 25ms                            |

---

## Display Animations

| Animation          | Trigger           | Description                                           |
| ------------------ | ----------------- | ----------------------------------------------------- |
| **Nexa Board**     | System startup    | Cyan scan lines, animated box with text, progress bar |
| **RFID Request**   | Waiting for card  | Animated card graphic with "TAP CARD" text            |
| **Access Granted** | Valid RFID card   | Green circle with checkmark                           |
| **Access Denied**  | Invalid RFID card | Red circle with X mark                                |
| **Success**        | Correct password  | Green expanding circle, checkmark, sparkles           |
| **Error**          | Wrong password    | Red box shake, X symbol, attempts counter             |
| **Lock**           | Max attempts      | Red lock icon, "LOCKED" text                          |
| **Lock Timer**     | During lock       | Yellow circular timer countdown                       |
| **Queue Empty**    | `queue_empty` cmd | Yellow box icon with "QUEUE IS EMPTY" text, LED flash |

---

## Serial Debug Messages

### Display Manager

```
[Display] initialized
[Display] mode menu page 1/2
[Display] turnOffScreen called
[Display] turnOnScreen called
[Display] nexaBoardAnimation done
[Display] RFID card animation ready
[Display] accessGrantedAnimation
[Display] accessDeniedAnimation (centered)
```

### RFID Manager

```
[RFID] initialized
[RFID] card detected UID=XX XX XX XX
[RFID] authorized card
[RFID] unauthorized card
```

### RGB Manager

```
[RGB] effect start: writing/erasing/exit
[RGB] effect end: writing/erasing/exit
```

### Security System

```
[Security] reset
[Security] locked now
[Security] checking password input=XXXX
[Security] password correct
[Security] password incorrect, attempt=X
```

### Login System

```
[Login] card authorized -> go to ENTER_PASSWORD
[Login] wrong card detected
[Login] '#' pressed - checking password=XXXX
[Login] password incorrect
[Login] '*' pressed - password cleared
[Login] appended key to password, now=XXXX
[Login] loggedIn = true
```

### Mode Selection

```
[ModeSelection] key=X
[ModeSelection] logged out, waiting for RFID
[ModeSelection] previous page
[ModeSelection] next page
[ModeSelection] unknown key
```

### Server Command Handler

```
[Server] Command Received: XXXX
[Server] Ignored command (system locked)
[Server] Ignored (user not logged in)
[Server] Ignored: cannot start new mode while another mode is running
[Server] → Logout triggered
[Server] → Manual LOCK triggered from server
[Server] Unknown command
```

### System Messages

```
[System] starting...
[System] ready and waiting for RFID
[System] Screen turned off (Sleep Mode) - systemActive=false
[System] Screen reactivated (Wake Up) - systemActive=true
[System] key pressed while sleeping -> wakeFromSleep()
```

---

## Color Definitions (ST77XX Colors)

| Color Name       | Hex Value | Usage                      |
| ---------------- | --------- | -------------------------- |
| `ST77XX_BLACK`   | 0x0000    | Background, clear screen   |
| `ST77XX_WHITE`   | 0xFFFF    | Text, general elements     |
| `ST77XX_RED`     | 0xF800    | Error, lock, erasing       |
| `ST77XX_GREEN`   | 0x07E0    | Success, progress          |
| `ST77XX_BLUE`    | 0x001F    | UI elements                |
| `ST77XX_CYAN`    | 0x07FF    | Title, UI accents, drawing |
| `ST77XX_YELLOW`  | 0xFFE0    | Warnings, highlights       |
| `ST77XX_MAGENTA` | 0xF81F    | UI variety                 |

---

## System Behavior Summary

### Normal Operation Flow

1. **Power On** → Nexa Board animation → RFID screen
2. **Tap Card** → RFID check → Access granted/denied animation
3. **Enter Password** → 4-digit input with masking → Verify
4. **Login Success** → Mode menu (page 1)
5. **Select Mode** → Enter mode → Perform actions → Exit
6. **Return to Menu** → Select another mode OR logout (key 3)
7. **Logout** → Return to RFID screen

### Error Handling

- **Wrong RFID**: Red X animation → Return to RFID screen
- **Wrong Password**: Error animation → Attempt counter → Retry or Lock
- **3 Failed Attempts**: Lock animation → 30-second countdown → Auto unlock → RFID screen
- **30s Inactivity**: Sleep mode → Screen off → Wake on keypress

### Command Restrictions

- ✅ `ready` works anytime
- ✅ `exiting` and `locked` work when logged in or as override
- ❌ Mode commands require login and no active mode
- ❌ Exit commands only work in their specific mode
- ❌ All commands blocked during lock

---

## Notes & Special Behaviors

### Important Restrictions

1. **Only ONE mode can run at a time** - attempts to start new mode while another is active are ignored
2. **Only Screenshot mode** cannot be exited via keypad - requires server command
3. **All other modes (Pen1, Pen2, Erasing Pen, Writing, Erasing)** can be exited via `#` key OR server command
4. **Logout from menu** is available via `D` key on both pages
5. **Sleep mode** does NOT activate while a mode is running
6. **Server commands** are checked continuously inside all modes
7. **Menu navigation debounce** - 250ms delay prevents rapid key presses

### Automatic Behaviors

- **Lock auto-expires** after 30 seconds → returns to RFID screen
- **Sleep auto-activates** after 30 seconds inactivity (only when not in a mode)
- **Activity tracking** is updated on any keypress
- **Password clears** on logout or lock

### Display Text Sizes

- **Title**: Size 3
- **Messages**: Size 2
- **Small text**: Size 1
- **Password stars**: Size 3
