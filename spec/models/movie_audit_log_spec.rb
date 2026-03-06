# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MovieAuditLog do
  it 'inherits the shared media audit log table mapping' do
    expect(described_class.table_name).to eq('movie_audit_logs')
  end

  describe '.record_changes' do
    let(:user) { create(:user) }
    let(:plex_server) { create(:plex_server, user:) }
    let(:fields) { { title: 'After Title' } }
    let(:before_state) { before_snapshot }
    let(:after_state) { after_snapshot }
    let(:before_snapshot) do
      {
        section_id: '10',
        section_title: 'Movies',
        movie_title: 'Before Movie',
        'title' => 'Before Title',
        'genres' => %w[Comedy Drama]
      }
    end
    let(:after_snapshot) do
      {
        section_id: '10',
        section_title: 'Movies',
        movie_title: 'After Movie',
        'title' => 'After Title',
        'genres' => %w[Drama Thriller]
      }
    end

    def record_changes(user:, plex_server:, fields:, before_snapshot:, after_snapshot:)
      described_class.record_changes(
        user: user,
        plex_server: plex_server,
        media_type: 'movie',
        media_id: '99',
        fields: fields,
        before: before_snapshot,
        after: after_snapshot
      )
    end

    it 'creates a record when a scalar field changes' do
      expect do
        record_changes(user: user, plex_server: plex_server, fields: fields,
                       before_snapshot: before_state, after_snapshot: after_state)
      end.to change(described_class, :count).by(1)
    end

    context 'when storing scalar metadata' do
      subject(:audit_log) { described_class.last }

      before do
        record_changes(user: user, plex_server: plex_server, fields: fields,
                       before_snapshot: before_state, after_snapshot: after_state)
      end

      it 'marks the field as scalar' do
        expect(described_class.last.field_type).to eq('scalar')
      end

      it 'stores the scalar field name' do
        expect(audit_log.field_name).to eq('title')
      end

      it { expect(audit_log.media_type).to eq('movie') }
      it { expect(audit_log.media_id).to eq('99') }
      it { expect(audit_log.media_title).to eq('After Movie') }
      it { expect(audit_log.movie_id).to eq('99') }
      it { expect(audit_log.movie_title).to eq('After Movie') }
    end

    context 'when storing tag metadata' do
      let(:fields) { { genres: %w[Drama Thriller] } }

      before do
        record_changes(user: user, plex_server: plex_server, fields: fields,
                       before_snapshot: before_state, after_snapshot: after_state)
      end

      it 'marks the field as tag' do
        expect(described_class.last.field_type).to eq('tag')
      end

      it 'stores old tag values as json' do
        expect(described_class.last.old_value).to eq('["Comedy","Drama"]')
      end

      it 'stores new tag values as json' do
        expect(described_class.last.new_value).to eq('["Drama","Thriller"]')
      end
    end

    context 'when there is no change' do
      let(:before_state) { after_snapshot }

      it 'does not create a record' do
        expect do
          record_changes(user: user, plex_server: plex_server, fields: fields,
                         before_snapshot: before_state, after_snapshot: after_state)
        end.not_to change(described_class, :count)
      end
    end

    context 'when field is unknown' do
      let(:fields) { { unknown: 'value' } }

      it 'does not create a record' do
        expect do
          record_changes(user: user, plex_server: plex_server, fields: fields,
                         before_snapshot: before_state, after_snapshot: after_state)
        end.not_to change(described_class, :count)
      end
    end
  end
end
