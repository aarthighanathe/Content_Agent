-- CORR-006: atomic pending → publishing claim before social API call
ALTER TYPE "publish_status" ADD VALUE IF NOT EXISTS 'publishing';
