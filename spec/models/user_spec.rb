# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  subject(:user) { build(:user) }

  it { is_expected.to have_many(:sessions).dependent(:destroy) }
  it { is_expected.to have_many(:plex_servers).dependent(:destroy) }
  it { is_expected.to have_many(:media_audit_logs).class_name('MediaAuditLog').dependent(:destroy) }
  it { is_expected.to have_many(:movie_audit_logs) }
  it { is_expected.to have_secure_password }

  describe 'email normalization' do
    let(:normalized_user) { create(:user, email_address: '  TeSt@Example.COM  ') }

    it 'strips and downcases the email address' do
      expect(normalized_user.email_address).to eq('test@example.com')
    end
  end
end
