# frozen_string_literal: true

class CreateMovieAuditLogs < ActiveRecord::Migration[8.1]
  # rubocop:disable Metrics/MethodLength
  def change
    create_table :movie_audit_logs do |t|
      t.integer :user_id, null: false
      t.integer :plex_server_id, null: false
      t.string :section_id, null: false
      t.string :section_title, null: false
      t.string :movie_id, null: false
      t.string :movie_title, null: false
      t.string :field_name, null: false
      t.string :field_type, null: false
      t.text :old_value
      t.text :new_value

      t.timestamps
    end

    add_index :movie_audit_logs, :user_id
    add_index :movie_audit_logs, %i[movie_id field_name]
    add_index :movie_audit_logs, :created_at
    add_foreign_key :movie_audit_logs, :users
    add_foreign_key :movie_audit_logs, :plex_servers
  end
  # rubocop:enable Metrics/MethodLength
end
