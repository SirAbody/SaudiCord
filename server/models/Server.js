// Server Model
module.exports = (sequelize, DataTypes) => {
  const Server = sequelize.define('Server', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    inviteCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    tableName: 'servers'
  });

  return Server;
};
