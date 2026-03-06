# frozen_string_literal: true

class AddMediaFieldsToMovieAuditLogs < ActiveRecord::Migration[8.1]
  def up
    add_media_columns
    backfill_media_columns
    enforce_media_not_null
    add_media_index
  end

  def down
    remove_media_index
    remove_media_columns
  end

  private

  def add_media_columns
    add_column :movie_audit_logs, :media_type, :string
    add_column :movie_audit_logs, :media_id, :string
    add_column :movie_audit_logs, :media_title, :string
  end

  def backfill_media_columns
    execute <<~SQL.squish
      UPDATE movie_audit_logs
      SET media_type = 'movie',
          media_id = movie_id,
          media_title = movie_title
    SQL
  end

  def enforce_media_not_null
    change_column_null :movie_audit_logs, :media_type, false
    change_column_null :movie_audit_logs, :media_id, false
    change_column_null :movie_audit_logs, :media_title, false
  end

  def add_media_index
    add_index :movie_audit_logs, %i[media_type media_id], name: 'index_movie_audit_logs_on_media_type_and_media_id'
  end

  def remove_media_index
    remove_index :movie_audit_logs, name: 'index_movie_audit_logs_on_media_type_and_media_id'
  end

  def remove_media_columns
    remove_column :movie_audit_logs, :media_title
    remove_column :movie_audit_logs, :media_id
    remove_column :movie_audit_logs, :media_type
  end
end
