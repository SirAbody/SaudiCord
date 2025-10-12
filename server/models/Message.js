// Message Model
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'file', 'system'),
      defaultValue: 'text'
    },
    edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    mentions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    reactions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'messages',
    paranoid: true // Soft delete support
  });

  return Message;
};
