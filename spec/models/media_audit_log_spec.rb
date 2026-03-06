# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MediaAuditLog do
  it { is_expected.to belong_to(:user) }
  it { is_expected.to belong_to(:plex_server) }

  describe '.recent' do
    it 'orders audit rows from newest to oldest' do
      older = create(:media_audit_log, created_at: 2.days.ago)
      newer = create(:media_audit_log, created_at: 1.day.ago)

      expect(described_class.recent).to start_with(newer, older)
    end
  end
end
