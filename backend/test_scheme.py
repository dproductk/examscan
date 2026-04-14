import requests

payload = {
    "subject_name": "Test Subject",
    "subject_code": "TS101",
    "department": "Engineering",
    "semester": 1,
    "sections": [
        {
            "name": "Q1",
            "rule": "all",
            "rule_count": None,
            "sub_questions": [
                {
                    "name": "Q1A",
                    "rule": "all",
                    "rule_count": None,
                    "parts": [
                        {"name": "1", "max_marks": 10}
                    ]
                }
            ]
        }
    ]
}

# We need a token. Let's create an exam dept user and get token
# First let's do this from within django view context to make it easier, or use shell script
