from rest_framework import serializers
from .models import EvaluationResult


class EvaluationResultSerializer(serializers.ModelSerializer):
    """
    Serializer for EvaluationResult.
    Validates marks_obtained: 0 ≤ value ≤ max_marks for every question.
    """
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    answer_sheet_id = serializers.IntegerField(source='answer_sheet.id', read_only=True)

    class Meta:
        model = EvaluationResult
        fields = [
            'id', 'answer_sheet', 'answer_sheet_id', 'teacher', 'teacher_name',
            'section_results', 'total_marks', 'submitted_at', 'graded_at',
            'last_edited_at', 'pdf_version_at_grading',
            'was_amended', 'amended_at',
        ]
        read_only_fields = ['id', 'submitted_at', 'graded_at', 'last_edited_at', 'teacher', 'total_marks', 'was_amended', 'amended_at']

    def validate_section_results(self, value):
        """Validate marks_obtained for every question in every section."""
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError('section_results must be a non-empty list.')

        errors = {}
        computed_total = 0

        for section in value:
            section_name = section.get('section_name', 'Unknown')
            if 'questions' not in section or not isinstance(section['questions'], list):
                raise serializers.ValidationError(
                    f'Section "{section_name}" must have a "questions" list.'
                )

            section_total = 0
            for q in section['questions']:
                q_no = q.get('question_no', '?')
                max_marks = q.get('max_marks', 0)
                marks_obtained = q.get('marks_obtained')

                if marks_obtained is None:
                    errors[f'Section {section_name}, Q{q_no}'] = ['marks_obtained is required.']
                    continue

                if not isinstance(marks_obtained, (int, float)):
                    errors[f'Section {section_name}, Q{q_no}'] = ['marks_obtained must be a number.']
                    continue

                if marks_obtained < 0 or marks_obtained > max_marks:
                    errors[f'Section {section_name}, Q{q_no}'] = [
                        f'marks_obtained must be between 0 and {max_marks}.'
                    ]
                    continue

                section_total += marks_obtained

            section['section_total'] = section_total
            computed_total += section_total

        if errors:
            raise serializers.ValidationError(errors)

        # Store computed total for use in create/update
        self._computed_total = computed_total
        return value

    def create(self, validated_data):
        validated_data['total_marks'] = getattr(self, '_computed_total', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if hasattr(self, '_computed_total'):
            validated_data['total_marks'] = self._computed_total
        return super().update(instance, validated_data)
