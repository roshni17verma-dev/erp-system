const {
  createDispatch,
  getDispatches,
  getDispatchById,
} = require("../services/dispatch.service");

// ============================================================
// CREATE DISPATCH
// ============================================================

const createDispatchController = async (req, res, next) => {
  try {
    const salesOrderId = req.params.id;

    const dispatch = await createDispatch(
      salesOrderId,
      req.body
    );

    return res.status(201).json({
      message: "Dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ALL DISPATCHES
// ============================================================

const getDispatchesController = async (req, res, next) => {
  try {
    const dispatches = await getDispatches();

    return res.status(200).json({
      dispatches,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET DISPATCH BY ID
// ============================================================

const getDispatchByIdController = async (
  req,
  res,
  next
) => {
  try {
    const dispatchId = req.params.id;

    const dispatch = await getDispatchById(
      dispatchId
    );

    return res.status(200).json({
      dispatch,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createDispatchController,
  getDispatchesController,
  getDispatchByIdController,
};