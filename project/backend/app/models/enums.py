import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    REVIEWER = "reviewer"
    MANAGER = "manager"
    ADMIN = "admin"


class LoyaltyTier(str, enum.Enum):
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class ComplaintChannel(str, enum.Enum):
    WEB_FORM = "web_form"
    CHAT = "chat"
    EMAIL = "email"
    DOCUMENT = "document"
    PHONE = "phone"
    SOCIAL_MEDIA = "social_media"
    MOBILE_APP = "mobile_app"


class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    VALIDATING = "validating"
    PROCESSING = "processing"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    AWAITING_CUSTOMER = "awaiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"
    ESCALATED = "escalated"


class Priority(str, enum.Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class Urgency(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PipelineType(str, enum.Enum):
    GENAI = "genai"
    GROUND_TRUTH = "ground_truth"


class ConflictSeverity(str, enum.Enum):
    NONE = "none"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class HistoryAction(str, enum.Enum):
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"
    ASSIGNED = "assigned"
    ESCALATED = "escalated"
    NOTE_ADDED = "note_added"
    RESPONSE_SENT = "response_sent"
    CONFLICT_RESOLVED = "conflict_resolved"
    REOPENED = "reopened"
    CLOSED = "closed"
    REVIEWER_COMMENT = "reviewer_comment"
    REJECTED = "rejected"
    RESPONSE_REGENERATED = "response_regenerated"


class MessageSender(str, enum.Enum):
    CUSTOMER = "customer"
    AGENT = "agent"
    SYSTEM = "system"


class KnowledgeBaseStatus(str, enum.Enum):
    ACTIVE = "active"
    PREVIOUS = "previous"
    SUPERSEDED = "superseded"
    DRAFT = "draft"


class PreferredContactChannel(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"
    SMS = "sms"


class EmailIntakeOutcome(str, enum.Enum):
    COMPLAINT_CREATED = "complaint_created"
    ATTACHED_TO_EXISTING = "attached_to_existing"
    UNCLASSIFIED = "unclassified"
    MANUAL_REVIEW_UNVERIFIED_SENDER = "manual_review_unverified_sender"
    MANUAL_REVIEW_UNREGISTERED_SENDER = "manual_review_unregistered_sender"
