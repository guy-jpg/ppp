import os
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
]


def authenticate():
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        with open("token.json", "w") as f:
            f.write(creds.to_json())
    return creds


def list_courses(service):
    results = service.courses().list(pageSize=20).execute()
    return results.get("courses", [])


def fetch_coursework(service, course_id):
    items = []
    page_token = None
    while True:
        resp = service.courses().courseWork().list(
            courseId=course_id, pageToken=page_token
        ).execute()
        items.extend(resp.get("courseWork", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def fetch_announcements(service, course_id):
    items = []
    page_token = None
    while True:
        resp = service.courses().announcements().list(
            courseId=course_id, pageToken=page_token
        ).execute()
        items.extend(resp.get("announcements", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def save_instructions(course_name, coursework, announcements):
    output = {"course": course_name, "coursework": [], "announcements": []}

    for cw in coursework:
        output["coursework"].append({
            "title": cw.get("title", ""),
            "description": cw.get("description", ""),
            "dueDate": cw.get("dueDate", {}),
            "state": cw.get("state", ""),
            "creationTime": cw.get("creationTime", ""),
        })

    for ann in announcements:
        output["announcements"].append({
            "text": ann.get("text", ""),
            "state": ann.get("state", ""),
            "creationTime": ann.get("creationTime", ""),
        })

    filename = f"classroom_instructions_{course_name.replace(' ', '_')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nנשמר ל: {filename}")
    return filename


def main():
    print("מתחבר ל-Google Classroom...")
    creds = authenticate()
    service = build("classroom", "v1", credentials=creds)

    courses = list_courses(service)
    if not courses:
        print("לא נמצאו קורסים.")
        return

    print("\nהקורסים שלך:")
    for i, course in enumerate(courses):
        print(f"  {i + 1}. {course['name']} (ID: {course['id']})")

    choice = input("\nבחר מספר קורס: ").strip()
    try:
        idx = int(choice) - 1
        course = courses[idx]
    except (ValueError, IndexError):
        print("בחירה לא תקינה.")
        return

    print(f"\nמושך הוראות מהקורס: {course['name']}...")
    coursework = fetch_coursework(service, course["id"])
    announcements = fetch_announcements(service, course["id"])

    print(f"נמצאו {len(coursework)} משימות ו-{len(announcements)} הודעות.")
    filename = save_instructions(course["name"], coursework, announcements)

    print("\n--- תצוגה מקדימה ---")
    for cw in coursework[:3]:
        print(f"\nמשימה: {cw.get('title', '')}")
        desc = cw.get('description', '')
        if desc:
            print(f"  {desc[:200]}")


if __name__ == "__main__":
    main()
