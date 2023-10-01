const { Sequelize, DataTypes, Op } = require("sequelize");

require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.USER,
  process.env.PASSWORD,
  {
    host: process.env.HOST,
    dialect: "postgres",
    dialectOptions: {},
  }
);

const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

testDbConnection();

const FrameMolding = sequelize.define(
  "frame_molding",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    material: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

const Color = sequelize.define(
  "color",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
  },
  { timestamps: false }
);

Color.hasMany(FrameMolding, {
  foreignKey: { name: "color_id", allowNull: false },
  onDelete: "CASCADE",
});

FrameMolding.belongsTo(Color, {
  foreignKey: { name: "color_id", allowNull: false },
  onDelete: "CASCADE",
});

sequelize.sync().then(() => {
  console.log("Models synced");
});

function getProducts(params) {
  return new Promise(function (resolve, reject) {
    const sort =
      params.sortBy && params.orderBy
        ? [params.sortBy, params.orderBy]
        : ["id", "desc"];

    console.log(sort);

    if (params.title) {
      querySettings.title = { [Op.iLike]: `%${params.title}%` };
    }

    const func = async () => {
      try {
        const result = await FrameMolding.findAndCountAll({
          include: [{ model: Color }],
        });
        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };

    func();
  });
}

function getProductById(id) {
  return new Promise(function (resolve, reject) {
    console.log(id);

    const func = async () => {
      try {
        const result = await Product.findByPk(id, {
          attributes: ["id", "images"],
          include: [
            { model: ProductInfo },
            {
              model: ProductProperty,
              through: { attributes: [] },
            },
            {
              model: ProductChild,
              attributes: ["id", "price", "count"],
              include: [{ model: ChildProperty }],
            },
          ],
        });
        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };

    func();
  });
}

function getFilters() {
  return new Promise(function (resolve, reject) {
    const func = async () => {
      try {
        const filter_names = [
          { name: "материал", eng_name: "material" },
          { name: "размер", eng_name: "width" },
          { name: "цена", eng_name: "price" },
          { name: "цвет", eng_name: "color" },
        ];

        const result = await Promise.all(
          filter_names.map(async (filter_name) => {
            const filters = await FrameMolding.findAll({
              attributes:
                filter_name.eng_name === "color" ? [] : [filter_name.eng_name],
              distinct: true,
              group:
                filter_name.eng_name === "color"
                  ? undefined
                  : [filter_name.eng_name],
              include:
                filter_name.eng_name === "color"
                  ? [{ model: Color, distinct: true, group: ["id"] }]
                  : undefined,
            });
            return {
              ...filter_name,
              filters: filters.map((filter) => filter[filter_name.eng_name]),
            };
          })
        );

        console.log(result[0].filters);
        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };
    func();
  });
}

module.exports = {
  getProducts,
  getProductById,
  getFilters,
};
