const db = require("../models/index");
const { success, failed } = require("./responce");

exports.create = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const cart = await db.Cart.create(
      {
        ...req.body,
      },
      { transaction: t }
    );
    const { cartItems } = req.body;
    let cartItemsArray = [];
    if (cartItems && cartItems.length > 0) {
      for (let i = 0; i < cartItems.length; i++) {
        const item = await db.CartItem.create(
          {
            ...cartItems[i],
            cartId: cart.id,
          },
          { transaction: t }
        );
        cartItemsArray.push(item);
      }
    }
    await t.commit();
    const { id, ...rest } = cart.dataValues;
 
    req.responce = {
      success: true,
      code: 200,
      message: "Cart created successfully.",
      results: {
        ...rest,
        translations: [...cartItemsArray],
      },
    };
    next();
  } catch (error) {
    await t.rollback();
    req.responce = {
      success: false,
      message: "Unable to create cart.",
      error,
    };
    next();
  }
};

exports.update = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const cart = await db.Cart.update(
      { ...req.body },
      {
        where: {
          id: req.cart.id,
        },
        returning: true,
        plain: true,
      },
      { transaction: t }
    );
    const { dataValues } = cart[1];

    const { cartItems } = req.body;
    let cartItemsArray = [];
    if (cartItems && cartItems.length > 0) {
      for (let i = 0; i < cartItems.length; i++) {
        if (cartItems[i].uuid) {
          const item = await db.CartItem.findOne({
            where: { uuid: cartItems[i].uuid },
          });

          if (item !== null) {
            // updating
            const cartItem = await db.CartItem.update(
              { ...cartItems[i] },
              {
                where: {
                  id: item.id,
                },
                returning: true,
                plain: true,
              },
              { transaction: t }
            );
            cartItemsArray.push(cartItem[1]);
          } else {
            // creating new row
            const cartItem = await db.CartItem.create(
              {
                ...cartItems[i],
                cartId: req.cart.id,
              },
              { transaction: t }
            );
            cartItemsArray.push(cartItem);
          }
        } else {
          // creating new row
          const cartItem = await db.CartItem.create(
            {
              ...translations[i],
              cartId: req.cart.id,
            },
            { transaction: t }
          );
          cartItemsArray.push(cartItem);
        }
      }
    }

    await t.commit();
    const { id, ...rest } = dataValues;
    const activeFiles = [];
    const inactiveFiles = [];
    const { icon, thumbnail } = req.body;
    if (!req.category.icon) {
      if (icon) {
        activeFiles.push({
          genre: "category",
          componentUUID: rest.uuid,
          componentSlug: rest.slug,
          componentField: "icon",
          url: icon,
        });
      }
    } else {
      if (icon && icon !== req.category.icon) {
        activeFiles.push({
          genre: "category",
          componentUUID: rest.uuid,
          componentSlug: rest.slug,
          componentField: "icon",
          url: icon,
        });
        inactiveFiles.push(req.category.icon);
      }
    }
    if (!req.category.thumbnail) {
      if (thumbnail) {
        activeFiles.push({
          genre: "category",
          componentUUID: rest.uuid,
          componentSlug: rest.slug,
          componentField: "thumbnail",
          url: thumbnail,
        });
      }
    } else {
      if (thumbnail && thumbnail !== req.category.thumbnail) {
        activeFiles.push({
          genre: "category",
          componentUUID: rest.uuid,
          componentSlug: rest.slug,
          componentField: "thumbnail",
          url: thumbnail,
        });
        inactiveFiles.push(req.category.thumbnail);
      }
    }

    req.activeFiles = activeFiles;
    req.inactiveFiles = inactiveFiles;

    req.responce = {
      success: true,
      code: 200,
      message: "Category updated successfully.",
      results: {
        ...rest,
        translations: [...translationsArray],
      },
    };
    next();
  } catch (error) {
    await t.rollback();
    req.responce = {
      success: false,
      message: "Unable to update category.",
      error,
    };
    next();
  }
};

exports.categoryByUUID = async (req, res, next, uuid) => {
  try {
    const category = await db.Category.findOne({ where: { uuid } });
    if (category === null) {
      failed(
        res,
        `Unable to find category by UUID. ${uuid}`,
        (error = { name: "not_found" })
      );
    } else {
      req.category = category;
      next();
    }
  } catch (error) {
    failed(res, `Unable to find category by UUID. ${uuid}`, error);
  }
};
exports.translationByUUID = async (req, res, next, uuid) => {
  try {
    const translation = await db.CategoryTranslation.findOne({
      where: { uuid },
    });
    if (translation === null) {
      failed(
        res,
        `Unable to find translation by UUID. ${uuid}`,
        (error = { name: "not_found" })
      );
    } else {
      req.translation = translation;
      next();
    }
  } catch (error) {
    failed(res, `Unable to find translation by UUID. ${uuid}`, error);
  }
};

exports.categoryBySlug = async (req, res, next, slug) => {
  try {
    const category = await db.Category.findOne({ where: { slug: slug } });
    if (category === null) {
      failed(
        res,
        `Unable to find category by slug. ${slug}`,
        (error = { name: "not_found" })
      );
    } else {
      req.category = category;
      next();
    }
  } catch (error) {
    failed(res, `Unable to find category by slug. ${slug}`, error);
  }
};

exports.read = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Category retrieve successfully.",
    results: req.category,
  });
};
exports.softRemove = async (req, res, next) => {
  const t = await db.sequelize.transaction();

  try {
    const category = await db.Category.update(
      { deletedAt: db.Sequelize.fn("now") },
      {
        where: {
          id: req.category.id,
        },
        returning: true,
        plain: true,
      },
      { transaction: t }
    );

    const { dataValues } = category[1];
    const translations = await db.CategoryTranslation.update(
      { deletedAt: db.Sequelize.fn("now") },
      {
        where: {
          categoryId: req.category.id,
        },
        returning: true,
      },
      { transaction: t }
    );

    await t.commit();
    const { id, ...rest } = dataValues;
    req.responce = {
      success: true,
      code: 200,
      message: "Category softly deleted.",
      results: {
        ...rest,
        translations: translations[1],
      },
    };
    next();
  } catch (error) {
    await t.rollback();
    req.responce = {
      success: false,
      message: "Unable apply soft delete operation on category.",
      error,
    };
    next();
  }
};
exports.reactivate = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  const { id } = req.category;
  try {
    const category = await db.Category.update(
      { deletedAt: null },
      {
        where: {
          id,
        },
        returning: true,
        plain: true,
      },
      { transaction: t }
    );

    const { dataValues } = category[1];

    const translations = await db.CategoryTranslation.update(
      { deletedAt: null },
      {
        where: {
          categoryId: id,
        },
        returning: true,
      },
      { transaction: t }
    );
    await t.commit();
    req.responce = {
      success: true,
      code: 200,
      message: "Category reactivate successfully.",
      results: {
        ...dataValues,
        translations: translations[1],
      },
    };
    next();
  } catch (error) {
    await t.rollback();
    req.responce = {
      success: false,
      message: "Unable to reactivate category.",
      error,
    };
    next();
  }
};
exports.reactivateTranslation = async (req, res) => {
  const { id } = req.translation;
  try {
    const translation = await db.CategoryTranslation.update(
      { deletedAt: null },
      {
        where: {
          id,
        },
        returning: true,
        plain: true,
      }
    );
    const { dataValues } = translation[1];
    success(res, 200, "Category Translation reactivate successfully.", {
      ...dataValues,
    });
    req.responce = {
      success: true,
      code: 200,
      message: "Category Translation reactivate successfully.",
      results: {
        ...dataValues,
      },
    };
    next();
  } catch (error) {
    req.responce = {
      success: false,
      message: "Unable to reactivate Category Translation.",
      error,
    };
    next();
  }
};
exports.hardRemove = async (req, res, next) => {
  try {
    await db.Category.destroy({
      where: {
        id: req.category.id,
      },
    });
    req.responce = {
      success: true,
      code: 200,
      message: `Category ${req.category.slug} deleted parmanently.`,
      results: {},
    };
    next();
  } catch (error) {
    req.responce = {
      success: false,
      message: "Unable to delete category.",
      error,
    };
    next();
  }
};
exports.hardRemoveTranslation = async (req, res, next) => {
  try {
    await db.CategoryTranslation.destroy({
      where: {
        id: req.translation.id,
      },
    });
    req.responce = {
      success: true,
      code: 200,
      message: "Category Translation deleted parmanently.",
      results: {},
    };
    next();
  } catch (error) {
    req.responce = {
      success: false,
      message: "Unable to delete category translation.",
      error,
    };
    next();
  }
};
// const category = await db.sequelize.query(
//   "SELECT * FROM categoryTranslations where code = ?",
//   { replacements: ["en-US"], type: QueryTypes.SELECT }
// );

exports.list = async (req, res, next) => {
  try {
    const categories = await db.Category.findAll({
      attributes: { exclude: ["delatedAt"] },
      order: [["order", "ASC"]],
      where: {
        deletedAt: null,
      },
      include: [
        {
          model: db.CategoryTranslation,
          as: "translations",
          // where: { code: "en-US" }, //{code: "en-US"}, {isDefault: true}
          where: db.Sequelize.and({ code: "en-US" }, { deletedAt: null }),
        },
      ],
    });
    if (categories === null || categories.length <= 0) {
      // failed(res, `Categories not found.`, (error = { name: "not_found" }));
      req.responce = {
        success: false,
        message: "Categories not found.",
        error: { name: "not_found" },
      };
      next();
    } else {
      // success(res, 200, "All categories retrieve successfully.", categories);
      req.responce = {
        success: true,
        code: 200,
        message: "All categories retrieve successfully.",
        results: categories,
      };
      next();
    }
  } catch (error) {
    req.responce = {
      success: false,
      message: "Categories not found.",
      error,
    };
    next();
  }
};
exports.listWithAllTranslation = async (req, res, next) => {
  try {
    const categories = await db.Category.findAll({
      include: [{ model: db.CategoryTranslation, as: "translations" }],
    });
    if (categories === null || categories.length <= 0) {
      // failed(res, `Categories not found.`, (error = { name: "not_found" }));
      req.responce = {
        success: false,
        message: "Categories not found.",
        error: { name: "not_found" },
      };
      next();
    } else {
      // success(res, 200, "All categories retrieve successfully.", categories);
      req.responce = {
        success: true,
        code: 200,
        message: "All categories retrieve successfully.",
        results: categories,
      };
      next();
    }
  } catch (error) {
    req.responce = {
      success: false,
      message: "Categories not found.",
      error,
    };
    next();
  }
};
