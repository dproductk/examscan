"""
Data migration: backfill token field on existing AnswerSheet rows.
Uses the roll_number as the token for legacy rows (since they pre-date the crypto system).
"""
from django.db import migrations


def backfill_tokens(apps, schema_editor):
    AnswerSheet = apps.get_model('scanning', 'AnswerSheet')
    for sheet in AnswerSheet.objects.filter(token=''):
        # For legacy sheets, use roll_number as the token value
        sheet.token = sheet.roll_number
        sheet.save(update_fields=['token'])

    AnswerSheetImage = apps.get_model('scanning', 'AnswerSheetImage')
    for img in AnswerSheetImage.objects.filter(token=''):
        img.token = img.roll_number
        img.save(update_fields=['token'])


def reverse_backfill(apps, schema_editor):
    pass  # No-op reverse


class Migration(migrations.Migration):

    dependencies = [
        ('scanning', '0004_add_token_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_tokens, reverse_backfill),
    ]
