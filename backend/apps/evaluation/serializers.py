from rest_framework import serializers
from .models import EvaluationResult


class EvaluationResultSerializer(serializers.ModelSerializer):
    """
    Serializer for EvaluationResult.
    Validates marks_obtained: 0 ≤ value ≤ max_marks for every question part.
    """
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    answer_sheet_id = serializers.IntegerField(source='answer_sheet.id', read_only=True)
    answer_sheet_status = serializers.CharField(source='answer_sheet.status', read_only=True)

    class Meta:
        model = EvaluationResult
        fields = [
            'id', 'answer_sheet', 'answer_sheet_id', 'answer_sheet_status',
            'teacher', 'teacher_name',
            'section_results', 'total_marks', 'submitted_at', 'graded_at',
            'last_edited_at', 'pdf_version_at_grading',
            'was_amended', 'amended_at',
            # Badge fields
            'mark_positions', 'marked_pdf_path',
        ]
        read_only_fields = [
            'id', 'submitted_at', 'graded_at', 'last_edited_at',
            'teacher', 'total_marks', 'was_amended', 'amended_at',
            'marked_pdf_path', 'answer_sheet_status',
        ]

    def validate_section_results(self, value):
        """Validate marks_obtained for every part using the Q -> SQ -> Part schema."""
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError('section_results must be a non-empty list.')

        errors = {}
        computed_total = 0

        for q in value:
            q_name = q.get('name', 'Unknown')
            if 'sub_questions' not in q or not isinstance(q['sub_questions'], list):
                raise serializers.ValidationError(f'Question "{q_name}" must have a "sub_questions" list.')

            sq_totals = []
            for sq in q['sub_questions']:
                sq_name = sq.get('name', 'Unknown')
                if 'parts' not in sq or not isinstance(sq['parts'], list):
                    raise serializers.ValidationError(f'Sub-question "{q_name}{sq_name}" must have a "parts" list.')

                part_totals = []
                for p in sq['parts']:
                    p_name = p.get('name', '?')
                    max_marks = p.get('max_marks', 0)
                    marks_obtained = p.get('marks_obtained')

                    if marks_obtained is None:
                        # null = unattempted — valid, counts as 0 in total
                        part_totals.append(0)
                        continue

                    if not isinstance(marks_obtained, (int, float)):
                        errors[f'{q_name}{sq_name}.{p_name}'] = ['marks_obtained must be a number.']
                        continue

                    if marks_obtained < 0 or marks_obtained > max_marks:
                        errors[f'{q_name}{sq_name}.{p_name}'] = [f'must be between 0 and {max_marks}.']
                        continue

                    part_totals.append(marks_obtained)

                # Apply sub-question attempt rule
                sq_rule = sq.get('rule', 'all')
                sq_rule_count = sq.get('rule_count')
                if sq_rule == 'any' and isinstance(sq_rule_count, int) and sq_rule_count > 0:
                    part_totals.sort(reverse=True)
                    sq_total = sum(part_totals[:sq_rule_count])
                else:
                    sq_total = sum(part_totals)

                sq['obtained_total'] = sq_total
                sq_totals.append(sq_total)

            # Apply question attempt rule
            q_rule = q.get('rule', 'all')
            q_rule_count = q.get('rule_count')
            if q_rule == 'any' and isinstance(q_rule_count, int) and q_rule_count > 0:
                sq_totals.sort(reverse=True)
                q_total = sum(sq_totals[:q_rule_count])
            else:
                q_total = sum(sq_totals)

            q['obtained_total'] = q_total
            computed_total += q_total

        if errors:
            raise serializers.ValidationError(errors)

        self._computed_total = computed_total
        return value

    def create(self, validated_data):
        validated_data['total_marks'] = getattr(self, '_computed_total', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if hasattr(self, '_computed_total'):
            validated_data['total_marks'] = self._computed_total
        return super().update(instance, validated_data)
