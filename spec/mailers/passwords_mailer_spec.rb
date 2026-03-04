# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PasswordsMailer do
  describe '.reset' do
    let(:user) { create(:user, email_address: 'mail-user@example.com') }
    let(:mail) { described_class.reset(user) }

    it 'sends to the user email address' do
      expect(mail.to).to eq(['mail-user@example.com'])
    end

    it 'uses the localized reset subject' do
      expect(mail.subject).to eq('Reset your password')
    end

    it 'uses the default from address' do
      expect(mail.from).to eq(['from@example.com'])
    end
  end
end
