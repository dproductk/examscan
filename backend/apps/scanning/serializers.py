from rest_framework import serializers
from .models import Subject, MarkingScheme, Bundle, AnswerSheet, AnswerSheetImage


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'subject_name', 'subject_code', 'department', 'semester']


class MarkingSchemeSerializer(serializers.ModelSerializer):
    """
    Validates sections JSON and auto-computes total_marks on create/update.
    """
    subject_code = serializers.CharField(source='subject.subject_code', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    department = serializers.CharField(source='subject.department', read_only=True)
    semester = serializers.IntegerField(source='subject.semester', read_only=True)

    class Meta:
        model = MarkingScheme
        fields = [
            'id', 'subject', 'subject_code', 'subject_name',
            'department', 'semester', 'total_marks', 'sections',
        ]
        read_only_fields = ['id', 'total_marks']

    def validate_sections(self, value):
        """Validate the new questions -> sub_questions -> parts JSON structure."""
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError('Paper structure must be a non-empty list of questions.')

        for q in value:
            if 'name' not in q:
                raise serializers.ValidationError('Each question must have a "name".')
            if 'sub_questions' not in q or not isinstance(q['sub_questions'], list):
                raise serializers.ValidationError(f'Question "{q.get("name")}" must have a "sub_questions" list.')
            
            for sq in q['sub_questions']:
                if 'name' not in sq:
                    raise serializers.ValidationError('Each sub-question must have a "name".')
                if 'parts' not in sq or not isinstance(sq['parts'], list):
                    raise serializers.ValidationError(f'Sub-question "{sq.get("name")}" must have a "parts" list.')
                
                for p in sq['parts']:
                    if 'max_marks' not in p:
                        raise serializers.ValidationError('Each part must have "max_marks".')
                    if not isinstance(p['max_marks'], (int, float)) or p['max_marks'] < 0:
                        raise serializers.ValidationError('Part max_marks must be a non-negative number.')
        return value

    def _compute_total(self, sections):
        """
        Computes Result Out Of.
        Rule for "any X": sorts children by max total and takes top X.
        """
        total = 0
        for q in sections:
            sq_totals = []
            for sq in q.get('sub_questions', []):
                part_totals = [p.get('max_marks', 0) for p in sq.get('parts', [])]
                
                sq_rule = sq.get('rule', 'all')
                sq_rule_count = sq.get('rule_count')
                
                if sq_rule == 'any' and isinstance(sq_rule_count, int) and sq_rule_count > 0:
                    part_totals.sort(reverse=True)
                    sq_totals.append(sum(part_totals[:sq_rule_count]))
                else:
                    sq_totals.append(sum(part_totals))

            q_rule = q.get('rule', 'all')
            q_rule_count = q.get('rule_count')
            
            if q_rule == 'any' and isinstance(q_rule_count, int) and q_rule_count > 0:
                sq_totals.sort(reverse=True)
                total += sum(sq_totals[:q_rule_count])
            else:
                total += sum(sq_totals)
                
        return total

    def create(self, validated_data):
        validated_data['total_marks'] = self._compute_total(validated_data['sections'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'sections' in validated_data:
            validated_data['total_marks'] = self._compute_total(validated_data['sections'])
        return super().update(instance, validated_data)


class BundleSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.subject_code', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    sheets_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    assigned_count = serializers.SerializerMethodField()

    class Meta:
        model = Bundle
        fields = [
            'id', 'subject', 'subject_code', 'subject_name',
            'bundle_number', 'total_sheets', 'academic_year', 'qr_raw_data',
            'status', 'created_by', 'created_by_name', 'created_at',
            'sheets_count', 'graded_count', 'assigned_count'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_sheets_count(self, obj):
        return obj.answer_sheets.count()

    def get_graded_count(self, obj):
        return obj.answer_sheets.filter(status='completed').count()

    def get_assigned_count(self, obj):
        return obj.answer_sheets.filter(assigned_teacher__isnull=False).count()


class AnswerSheetImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerSheetImage
        fields = ['id', 'bundle', 'roll_number', 'image', 'page_number', 'is_first_page', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at', 'roll_number']


class AnswerSheetSerializer(serializers.ModelSerializer):
    """
    Answer sheet serializer.
    roll_number is excluded from teacher-facing responses via get_fields().
    """
    bundle_number = serializers.CharField(source='bundle.bundle_number', read_only=True)
    subject_code = serializers.CharField(source='bundle.subject.subject_code', read_only=True)
    assigned_teacher_name = serializers.CharField(source='assigned_teacher.full_name', read_only=True)

    class Meta:
        model = AnswerSheet
        fields = [
            'id', 'bundle', 'bundle_number', 'subject_code',
            'roll_number', 'pdf_file', 'pdf_version', 'status',
            'assigned_teacher', 'assigned_teacher_name',
            'uploaded_at', 'scanned_by', 'scanned_at',
            'last_flagged_at', 'flag_reason',
        ]
        read_only_fields = ['id', 'uploaded_at', 'scanned_at']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        # Never expose roll_number to teachers
        if request and hasattr(request.user, 'role') and request.user.role == 'teacher':
            fields.pop('roll_number', None)
        return fields
