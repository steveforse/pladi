class CreatePlexServers < ActiveRecord::Migration[8.1]
  def change
    create_table :plex_servers do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name,  null: false
      t.string :url,   null: false
      t.string :token, null: false
      t.timestamps
    end
  end
end
