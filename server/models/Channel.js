// Channel Model
module.exports = (sequelize, DataTypes) => {
  const Channel = sequelize.define('Channel', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    type: {
      type: DataTypes.ENUM('text', 'voice', 'video'),
      defaultValue: 'text'
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    topic: {
      type: DataTypes.TEXT,
      defaultValue: null
    }
  }, {
    timestamps: true,
    tableName: 'channels'
  });

  return Channel;
};
