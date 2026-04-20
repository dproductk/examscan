import os
from django.core.management.base import BaseCommand
from apps.scanning.models import AnswerSheetImage, AnswerSheet


class Command(BaseCommand):
    help = (
        "Delete orphaned scanned images where the answer sheet PDF has already been compiled. "
        "Safe to run at any time — only removes images for finalized sheets."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting anything.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Find all roll numbers that already have a compiled PDF
        finalized = set(
            AnswerSheet.objects.values_list('bundle_id', 'roll_number')
        )

        orphaned_images = AnswerSheetImage.objects.all()
        deleted_files = 0
        deleted_records = 0
        freed_bytes = 0

        for img in orphaned_images:
            if (img.bundle_id, img.roll_number) in finalized:
                if dry_run:
                    size = 0
                    if img.image and os.path.isfile(img.image.path):
                        size = os.path.getsize(img.image.path)
                    self.stdout.write(
                        f'  [DRY RUN] Would delete: {img.image.name} ({size} bytes)'
                    )
                    freed_bytes += size
                    deleted_records += 1
                else:
                    try:
                        if img.image and os.path.isfile(img.image.path):
                            freed_bytes += os.path.getsize(img.image.path)
                            os.remove(img.image.path)
                            deleted_files += 1
                    except Exception as e:
                        self.stderr.write(f'  Warning: could not delete file {img.image.name}: {e}')
                    img.delete()
                    deleted_records += 1

        freed_mb = round(freed_bytes / (1024 * 1024), 2)

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\n[DRY RUN] Would delete {deleted_records} image records, freeing ~{freed_mb} MB.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nDone. Deleted {deleted_records} records, {deleted_files} files, freed ~{freed_mb} MB.'
            ))
