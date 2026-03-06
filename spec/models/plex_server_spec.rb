# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PlexServer do
  subject(:plex_server) { build(:plex_server) }

  it { is_expected.to belong_to(:user) }
  it { is_expected.to have_many(:media_audit_logs).class_name('MediaAuditLog').dependent(:destroy) }

  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_presence_of(:url) }
  it { is_expected.to validate_presence_of(:token) }
end
