# frozen_string_literal: true

class WarmLibraryEnrichmentJob < ApplicationJob
  queue_as :default

  def perform(server_id, scope_attributes, section_ids)
    server = PlexServer.find(server_id)
    scope = Plex::MediaScope.from_h(scope_attributes)
    service = Plex::Server.new(server)
    pending_ids = normalize_section_ids(section_ids)

    service.sections(scope:).each do |section|
      process_section(service:, server_id:, scope:, section:, pending_ids:)
    end
  end

  private

  def normalize_section_ids(section_ids)
    Array(section_ids).to_set(&:to_s)
  end

  def process_section(service:, server_id:, scope:, section:, pending_ids:)
    return unless pending_ids.include?(section[:id].to_s)

    service.stream_enrich_section(section, scope:) do |batch|
      broadcast_batch(server_id, scope, section, batch)
    end
    broadcast_completed(server_id, scope, section[:id])
  rescue StandardError
    broadcast_failure(server_id, scope, section[:id])
    Rails.logger.warn("WarmLibraryEnrichmentJob failed for server=#{server_id} section=#{section[:id]}")
  end

  def broadcast_batch(server_id, scope, section, batch)
    ActionCable.server.broadcast(
      LibraryEnrichmentStream.name(server_id, scope),
      {
        state: 'progress',
        section_id: section[:id].to_s,
        section_title: section[:title],
        items: batch
      }
    )
  end

  def broadcast_completed(server_id, scope, section_id)
    ActionCable.server.broadcast(
      LibraryEnrichmentStream.name(server_id, scope),
      { state: 'completed', section_id: section_id.to_s }
    )
  end

  def broadcast_failure(server_id, scope, section_id)
    ActionCable.server.broadcast(
      LibraryEnrichmentStream.name(server_id, scope),
      { state: 'failed', section_id: section_id.to_s }
    )
  end
end
