from __future__ import annotations

from typing import TYPE_CHECKING, Any

import boto3

from app.core.config import settings

if TYPE_CHECKING:
    pass


def ddb() -> Any:
    """
    DynamoDB resource.

    Returns:
        boto3.resources.factory.dynamodb.ServiceResource: DDB resource.
    """
    return boto3.resource("dynamodb", region_name=settings.aws_region)


def table(name: str) -> Any:
    """
    Get a DynamoDB table handle.

    Args:
        name (str): Table name.

    Returns:
        mypy_boto3_dynamodb.service_resource.Table: Table handle.
    """
    return ddb().Table(name)
