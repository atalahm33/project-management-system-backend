const Contract = require('../models/Contract');
const ContractSubmission = require('../models/ContractSubmission');
const AppError = require('../utils/AppError');

// @desc    Create a new contract
// @route   POST /api/contracts
// @access  Private
exports.createContract = async (req, res, next) => {
  try {
    const contractData = { ...req.body };
    if (typeof contractData.values === 'string') {
      try { contractData.values = JSON.parse(contractData.values); } catch(e){}
    }
    if (typeof contractData.paidAmounts === 'string') {
      try { contractData.paidAmounts = JSON.parse(contractData.paidAmounts); } catch(e){}
    }

    // Normalize currency keys to uppercase and filter out zero/empty values
    if (contractData.values && typeof contractData.values === 'object') {
      const normalized = {};
      Object.entries(contractData.values).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num > 0) normalized[k.toUpperCase()] = num;
      });
      contractData.values = normalized;
    }
    if (contractData.paidAmounts && typeof contractData.paidAmounts === 'object') {
      const normalized = {};
      Object.entries(contractData.paidAmounts).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num > 0) normalized[k.toUpperCase()] = num;
      });
      contractData.paidAmounts = normalized;
    }

    // Handle file uploads (images)
    if (req.files && req.files.length > 0) {
      // Store relative paths so frontend can easily access them via /uploads/...
      contractData.images = req.files.map(file => `/uploads/contracts/${file.filename}`);
    }

    contractData.createdBy = req.user._id;
    contractData.submissionStatus = 'pending_review';

    const contract = await ContractSubmission.create(contractData);

    // Add full host to images for response
    const host = `${req.protocol}://${req.get('host')}`;
    const formattedContract = contract.toObject();
    if (formattedContract.images) {
      formattedContract.images = formattedContract.images.map(img => `${host}${img}`);
    }

    res.status(201).json({
      status: 'success',
      data: {
        contract: formattedContract
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contracts
// @route   GET /api/contracts
// @access  Private
exports.getAllContracts = async (req, res, next) => {
  try {
    const contracts = await Contract.find().populate('projectId', 'title'); // populating project basic info if needed

    const host = `${req.protocol}://${req.get('host')}`;
    const formattedContracts = contracts.map(contract => {
      const obj = contract.toObject();
      if (obj.images) {
        obj.images = obj.images.map(img => `${host}${img}`);
      }
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: formattedContracts.length,
      data: {
        contracts: formattedContracts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single contract by ID
// @route   GET /api/contracts/:id
// @access  Private
exports.getContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('projectId', 'title');

    if (!contract) {
      return next(new AppError('No contract found with that ID', 404));
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const formattedContract = contract.toObject();
    if (formattedContract.images) {
      formattedContract.images = formattedContract.images.map(img => `${host}${img}`);
    }

    res.status(200).json({
      status: 'success',
      data: {
        contract: formattedContract
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a contract
// @route   PATCH /api/contracts/:id
// @access  Private
exports.updateContract = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (typeof updateData.values === 'string') {
      try { updateData.values = JSON.parse(updateData.values); } catch(e){}
    }
    if (typeof updateData.paidAmounts === 'string') {
      try { updateData.paidAmounts = JSON.parse(updateData.paidAmounts); } catch(e){}
    }

    // If new images are uploaded, append them to existing ones or replace them
    // (Here we append to existing, assuming frontend sends only new images to append or we replace)
    // To properly handle this, we just append to the existing ones
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/contracts/${file.filename}`);
      const existingContract = await Contract.findById(req.params.id);
      
      if (!existingContract) {
        return next(new AppError('No contract found with that ID', 404));
      }

      updateData.images = [...existingContract.images, ...newImages];
    }

    const contract = await Contract.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!contract) {
      return next(new AppError('No contract found with that ID', 404));
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const formattedContract = contract.toObject();
    if (formattedContract.images) {
      formattedContract.images = formattedContract.images.map(img => `${host}${img}`);
    }

    res.status(200).json({
      status: 'success',
      data: {
        contract: formattedContract
      }
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Create a supplementary contract (addendum)
// @route   POST /api/contracts/:id/supplementary
// @access  Private (Admin, Financial Manager)
exports.createSupplementaryContract = async (req, res, next) => {
  try {
    const parentId = req.params.id;
    // Verify parent contract exists
    const parentContract = await Contract.findById(parentId);
    if (!parentContract) {
      return next(new AppError('Parent contract not found', 404));
    }

    const contractData = { 
      ...req.body, 
      parentContractId: parentId,
      projectId: parentContract.projectId 
    };
    if (typeof contractData.values === 'string') {
      try { contractData.values = JSON.parse(contractData.values); } catch(e){}
    }
    if (typeof contractData.paidAmounts === 'string') {
      try { contractData.paidAmounts = JSON.parse(contractData.paidAmounts); } catch(e){}
    }

    // Normalize currency keys to uppercase and filter out zero/empty values
    if (contractData.values && typeof contractData.values === 'object') {
      const normalized = {};
      Object.entries(contractData.values).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num > 0) normalized[k.toUpperCase()] = num;
      });
      contractData.values = normalized;
    }
    if (contractData.paidAmounts && typeof contractData.paidAmounts === 'object') {
      const normalized = {};
      Object.entries(contractData.paidAmounts).forEach(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && num > 0) normalized[k.toUpperCase()] = num;
      });
      contractData.paidAmounts = normalized;
    }

    // Handle file uploads (images)
    if (req.files && req.files.length > 0) {
      contractData.images = req.files.map(file => `/uploads/contracts/${file.filename}`);
    }

    contractData.createdBy = req.user._id;
    contractData.submissionStatus = 'pending_review';

    const contract = await ContractSubmission.create(contractData);

    // Add full host to images for response
    const host = `${req.protocol}://${req.get('host')}`;
    const formattedContract = contract.toObject();
    if (formattedContract.images) {
      formattedContract.images = formattedContract.images.map(img => `${host}${img}`);
    }

    res.status(201).json({
      status: 'success',
      data: { contract: formattedContract }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contract hierarchy tree
// @route   GET /api/contracts/tree
// @access  Private
exports.getContractTree = async (req, res, next) => {
  try {
    const contracts = await Contract.find().lean(); // use lean for performance
    // Build map of id to contract node
    const contractMap = {};
    contracts.forEach(c => {
      c.children = [];
      c.totalValue = c.contractValue || 0; // initialize
      contractMap[c._id] = c;
    });

    const roots = [];
    contracts.forEach(c => {
      if (c.parentContractId) {
        const parent = contractMap[c.parentContractId];
        if (parent) {
          parent.children.push(c);
        }
      } else {
        roots.push(c);
      }
    });

    // Recursive function to compute totalValue including descendants
    const computeTotal = node => {
      let sum = node.contractValue || 0;
      node.children.forEach(child => {
        sum += computeTotal(child);
      });
      node.totalValue = sum;
      return sum;
    };
    roots.forEach(root => computeTotal(root));

    // Attach full host to images for each node
    const host = `${req.protocol}://${req.get('host')}`;
    const attachHost = node => {
      if (node.images) {
        node.images = node.images.map(img => `${host}${img}`);
      }
      node.children.forEach(attachHost);
    };
    roots.forEach(attachHost);

    res.status(200).json({
      status: 'success',
      data: { contracts: roots }
    });
  } catch (error) {
    next(error);
  }
};

// Existing exports remain unchanged

// @desc    Delete a contract
// @route   DELETE /api/contracts/:id
// @access  Private (Admin, Financial Manager)
exports.deleteContract = async (req, res, next) => {
  try {
    const contractId = req.params.id;
    // Prevent deletion if it has sub-contracts
    const hasSubcontracts = await Contract.findOne({ parentContractId: contractId });
    if (hasSubcontracts) {
      return next(new AppError('لا يمكن حذف هذا العقد لأنه يحتوي على عقود باطن مرتبطة به. يرجى حذف عقود الباطن أولاً.', 400));
    }
    const contract = await Contract.findByIdAndDelete(contractId);
    if (!contract) {
      return next(new AppError('No contract found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
