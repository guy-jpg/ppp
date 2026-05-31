#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Project Air Defense HMI — מערכת בקרת אש והגנה אווירית שולחנית.

==========================================================================
 לבנה 1 / 5 :  השלד (THE SKELETON)
==========================================================================
זהו הבסיס היציב שעליו נבנה הכל. בשלב הזה אין עדיין מכ"ם (YOLO) ואין כוונת
(MediaPipe) — רק קנבס וידאו נקי שמצייר עליו את ה-HMI הצבאי:

    * לולאת וידאו שעובדת גם מול מצלמה חיה וגם מול קובץ וידאו (--source).
    * גדר וירטואלית במרכז המסך (w // 2) שמחלקת ל-SAFE ZONE ו-DANGER ZONE.
    * צביעת האזורים בשקיפות באמצעות cv2.addWeighted (alpha = 0.15).
    * סרגל HUD עליון עם סטטוס המערכת, מד FPS חי, ומונה פריצות (עדיין 0).
    * שליטה במקלדת:  Q = יציאה,  R = Reset (כרגע placeholder).

הרצה:
    python air_defense_fusion.py                 # מצלמת ברירת מחדל (0)
    python air_defense_fusion.py --source 1      # מצלמה אחרת
    python air_defense_fusion.py --source clip.mp4   # קובץ וידאו (לופ אינסופי)
"""

import argparse
import time

import cv2
import numpy as np

# ==========================================================================
#  פרמטרים קבועים (CONFIG) — כל הקסמים מרוכזים כאן ויגדלו לבנה-לבנה
# ==========================================================================
WINDOW_NAME      = "AIR DEFENSE HMI v3.1"

# --- צבעים (BGR, כי ככה OpenCV עובד) ---
COLOR_SAFE       = (0, 200, 0)        # ירוק — אזור בטוח (שמאל)
COLOR_DANGER     = (0, 0, 230)        # אדום — אזור סכנה (ימין)
COLOR_FENCE      = (0, 255, 255)      # צהוב — קו הגדר הווירטואלית
COLOR_HUD_TEXT   = (0, 255, 0)        # ירוק זרחני לטקסט ה-HUD
COLOR_HUD_BG     = (0, 0, 0)          # רקע שחור לסרגל

ZONE_ALPHA       = 0.15               # שקיפות צביעת האזורים (מהמסמך)
HUD_HEIGHT       = 60                 # גובה סרגל ה-HUD העליון בפיקסלים


def parse_source(raw: str):
    """מחזיר int אם זה אינדקס מצלמה, אחרת מחזיר את הנתיב כמחרוזת (קובץ וידאו)."""
    return int(raw) if raw.isdigit() else raw


def draw_zones(frame):
    """
    מצייר את שתי הזונות (SAFE/DANGER) בשקיפות ואת קו הגדר הווירטואלית.
    הטריק: מציירים מלבנים מלאים על שכבה (overlay) ואז ממזגים אותה עם
    הפריים המקורי ב-addWeighted, כך מקבלים צבע שקוף בלי להסתיר את הווידאו.
    """
    h, w = frame.shape[:2]
    fence_x = w // 2                      # הגדר בדיוק באמצע המסך

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0),        (fence_x, h), COLOR_SAFE,   -1)  # שמאל = בטוח
    cv2.rectangle(overlay, (fence_x, 0),  (w, h),       COLOR_DANGER, -1)  # ימין = סכנה
    cv2.addWeighted(overlay, ZONE_ALPHA, frame, 1 - ZONE_ALPHA, 0, frame)

    # קו הגדר עצמו — קו צהוב מקווקו לאורך כל הגובה
    for y in range(HUD_HEIGHT, h, 24):
        cv2.line(frame, (fence_x, y), (fence_x, y + 12), COLOR_FENCE, 2)

    # תוויות אזורים
    cv2.putText(frame, "SAFE ZONE",   (20, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_SAFE, 2)
    cv2.putText(frame, "DANGER ZONE", (fence_x + 20, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_DANGER, 2)
    return fence_x


def draw_hud(frame, fps, breaches, status="SCANNING"):
    """סרגל HUD עליון: סטטוס מערכת + מד FPS חי + מונה פריצות."""
    h, w = frame.shape[:2]

    # רקע שחור אטום לסרגל כדי שהטקסט יהיה קריא מעל הווידאו
    cv2.rectangle(frame, (0, 0), (w, HUD_HEIGHT), COLOR_HUD_BG, -1)
    cv2.line(frame, (0, HUD_HEIGHT), (w, HUD_HEIGHT), COLOR_HUD_TEXT, 1)

    cv2.putText(frame, f"STATUS: {status}", (15, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_HUD_TEXT, 2)
    cv2.putText(frame, f"FPS: {fps:5.1f}", (w // 2 - 60, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_HUD_TEXT, 2)
    cv2.putText(frame, f"BREACHES: {breaches}", (w - 220, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_DANGER, 2)


def main():
    parser = argparse.ArgumentParser(description="Air Defense HMI — Brick 1: Skeleton")
    parser.add_argument("--source", default="0",
                        help="camera index (0,1,...) or path to a video file")
    args = parser.parse_args()

    source = parse_source(args.source)
    is_file = isinstance(source, str)

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise SystemExit(f"[!] לא הצלחתי לפתוח את מקור הווידאו: {source!r}")

    breaches = 0            # מונה פריצות — נתחיל לקדם אותו רק בלבנה 2 (YOLO)
    prev_t = time.time()
    fps = 0.0

    print("[*] AIR DEFENSE HMI online — Q ליציאה, R ל-Reset")

    while True:
        ok, frame = cap.read()
        if not ok:
            if is_file:                       # קובץ וידאו נגמר -> לופ מהתחלה
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            break                             # מצלמה חיה שנפלה -> יציאה

        frame = cv2.flip(frame, 1)            # מראה — נוח יותר לשליטה ביד

        # --- חישוב FPS חלק (ממוצע נע קל) ---
        now = time.time()
        dt = now - prev_t
        prev_t = now
        if dt > 0:
            fps = 0.9 * fps + 0.1 * (1.0 / dt)

        # --- שכבות הציור ---
        draw_zones(frame)
        draw_hud(frame, fps, breaches, status="SCANNING")

        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):             # Q או ESC
            break
        elif key == ord("r"):                 # Reset — placeholder ללבנות הבאות
            breaches = 0
            print("[*] RESET")

    cap.release()
    cv2.destroyAllWindows()
    print("[*] system offline.")


if __name__ == "__main__":
    main()
