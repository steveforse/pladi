# frozen_string_literal: true

class RenameMovieAuditLogsToMediaAuditLogs < ActiveRecord::Migration[8.1]
  def up
    rename_table :movie_audit_logs, :media_audit_logs
    rename_shared_indexes_to_media
    remove_legacy_movie_identity_index
    remove_columns :media_audit_logs, :movie_id, :movie_title, type: :string
    add_media_row_identity
  end

  def down
    remove_media_row_identity
    restore_legacy_movie_identity
    rename_shared_indexes_to_movie
    rename_table :media_audit_logs, :movie_audit_logs
  end

  private

  def rename_shared_indexes_to_media
    rename_index :media_audit_logs,
                 'index_movie_audit_logs_on_created_at',
                 'index_media_audit_logs_on_created_at'
    rename_index :media_audit_logs,
                 'index_movie_audit_logs_on_media_type_and_media_id',
                 'index_media_audit_logs_on_media_type_and_media_id'
    rename_index :media_audit_logs,
                 'index_movie_audit_logs_on_user_id',
                 'index_media_audit_logs_on_user_id'
  end

  def rename_shared_indexes_to_movie
    rename_index :media_audit_logs,
                 'index_media_audit_logs_on_created_at',
                 'index_movie_audit_logs_on_created_at'
    rename_index :media_audit_logs,
                 'index_media_audit_logs_on_media_type_and_media_id',
                 'index_movie_audit_logs_on_media_type_and_media_id'
    rename_index :media_audit_logs,
                 'index_media_audit_logs_on_user_id',
                 'index_movie_audit_logs_on_user_id'
  end

  def remove_legacy_movie_identity_index
    remove_index :media_audit_logs, name: 'index_movie_audit_logs_on_movie_id_and_field_name', if_exists: true
    remove_index :media_audit_logs, name: 'index_media_audit_logs_on_movie_id_and_field_name', if_exists: true
  end

  def add_media_row_identity
    add_column :media_audit_logs, :file_path, :string
    add_index :media_audit_logs, %i[media_type media_id file_path], name: 'index_media_audit_logs_on_media_identity'
  end

  def remove_media_row_identity
    remove_index :media_audit_logs, name: 'index_media_audit_logs_on_media_identity'
    remove_column :media_audit_logs, :file_path
  end

  def restore_legacy_movie_identity
    add_column :media_audit_logs, :movie_id, :string
    add_column :media_audit_logs, :movie_title, :string
    execute <<~SQL.squish
      UPDATE media_audit_logs
      SET movie_id = media_id,
          movie_title = media_title
    SQL
    change_column_null :media_audit_logs, :movie_id, false
    change_column_null :media_audit_logs, :movie_title, false
    add_index :media_audit_logs, %i[movie_id field_name], name: 'index_movie_audit_logs_on_movie_id_and_field_name'
  end
end
