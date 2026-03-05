# frozen_string_literal: true

class AddMediaFieldsToMovieAuditLogs < ActiveRecord::Migration[8.1]
  def up
    add_column :movie_audit_logs, :media_type, :string
    add_column :movie_audit_logs, :media_id, :string
    add_column :movie_audit_logs, :media_title, :string

    execute <<~SQL.squish
      UPDATE movie_audit_logs
      SET media_type = 'movie',
          media_id = movie_id,
          media_title = movie_title
    SQL

    change_column_null :movie_audit_logs, :media_type, false
    change_column_null :movie_audit_logs, :media_id, false
    change_column_null :movie_audit_logs, :media_title, false

    add_index :movie_audit_logs, %i[media_type media_id], name: 'index_movie_audit_logs_on_media_type_and_media_id'
  end

  def down
    remove_index :movie_audit_logs, name: 'index_movie_audit_logs_on_media_type_and_media_id'
    remove_column :movie_audit_logs, :media_title
    remove_column :movie_audit_logs, :media_id
    remove_column :movie_audit_logs, :media_type
  end
end
