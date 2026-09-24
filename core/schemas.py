from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

class SeedType(str, Enum):
    EMAIL = "email"
    USERNAME = "username"
    PHONE = "phone"
    DOMAIN = "domain"
    IP = "ip"
    URL = "url"

class SeedInput(BaseModel):
    value: str
    seed_type: SeedType
    depth: int = Field(default=2, ge=1, le=4, description="Recursive search depth")

class NodeCategory(str, Enum):
    IDENTITY = "identity"
    INFRASTRUCTURE = "infrastructure"
    BREACH = "breach"
    TELEPHONY = "telephony"
    SOCIAL = "social"
    URL = "url"

class GraphNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    canonical_id: str  # e.g. "email:target@domain.com"
    category: NodeCategory
    label: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphEdge(BaseModel):
    source_canonical_id: str
    target_canonical_id: str
    relationship: str  # e.g. "HAS_USERNAME", "RESOLVES_TO"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)

class InvestigationPayload(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seed: SeedInput
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    risk_score: int = 0
    # Risk engine context (level, triggered rules, confidence) rides along here.
    metadata: Dict[str, Any] = Field(default_factory=dict)
