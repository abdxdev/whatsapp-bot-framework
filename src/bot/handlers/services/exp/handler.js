export async function add(ctx) {
  const { args, userId, storage, state, userRoles } = ctx;
  const { childNo, amount, item } = args;

  if (amount === undefined) return 'Amount required';
  if (!item) return 'Item required';

  let targetUserId = userId;
  if (userRoles.includes('parent') && childNo !== undefined) {
    const children = await state.getUsersWithRole('child');
    if (childNo < 1 || childNo > children.length) return `Invalid child (1-${children.length})`;
    targetUserId = children[childNo - 1];
  }

  await storage.addItem('expenses', {
    id: Date.now().toString(36),
    item,
    amount,
    addedBy: targetUserId,
    createdAt: new Date().toISOString()
  });

  const entries = await storage.getStorage('expenses');
  const userEntries = entries.filter(e => e.addedBy === targetUserId);
  const total = userEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return `Added: ${item} - ${amount} (new total: ${total})`;
}

export async function edit(ctx) {
  const { args, userId, storage, userRoles } = ctx;
  const { itemNo, price, item } = args;

  if (!itemNo) return 'Item number required';

  let entries = await storage.getStorage('expenses');
  const isParent = userRoles.includes('parent');

  if (!isParent) entries = entries.filter(e => e.addedBy === userId);
  entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  if (itemNo < 1 || itemNo > entries.length) return `Invalid item (1-${entries.length})`;

  const entry = entries[itemNo - 1];
  if (entry.addedBy !== userId && !isParent) return 'Cannot edit others expenses';

  const updates = {
    editedBy: userId,
    editedAt: new Date().toISOString()
  };
  if (item !== undefined) updates.item = item;
  if (price !== undefined) updates.amount = price;

  await storage.updateItem('expenses', entry._id, updates);

  const allEntries = await storage.getStorage('expenses');
  const userEntries = allEntries.filter(e => e.addedBy === entry.addedBy);
  const total = userEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return `Updated: ${item || entry.item} - ${price !== undefined ? price : entry.amount} (new total: ${total})`;
}

export async function list(ctx) {
  const { userId, storage, state, userRoles } = ctx;
  let entries = await storage.getStorage('expenses');

  if (!entries?.length) return 'No expenses';

  const isParent = userRoles.includes('parent');

  if (isParent) {
    // Group all expenses by child
    const children = await state.getUsersWithRole('child');
    if (!children?.length) return 'No children';

    let response = '';
    let grandTotal = 0;

    for (const childId of children) {
      const childEntries = entries.filter(e => e.addedBy === childId);
      if (!childEntries.length) continue;

      childEntries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const total = childEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      grandTotal += total;

      const childName = await state.resolveUserName(childId);
      response += `*${childName}*\n`;
      response += childEntries.map((e, i) => `${i + 1}. ${e.item} - ${e.amount}`).join('\n');
      response += `\n_Total: ${total}_\n\n`;
    }

    if (!response) return 'No expenses';
    return response.trim() + `\n\n*Grand Total: ${grandTotal}*`;
  }

  // Child: show only own expenses
  entries = entries.filter(e => e.addedBy === userId);
  if (!entries.length) return 'No expenses';

  entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const total = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  let response = entries.map((e, i) => `${i + 1}. ${e.item} - ${e.amount}`).join('\n');
  return response + `\n\n*Total: ${total}*`;
}

export async function clear(ctx) {
  const { args, userId, storage, userRoles } = ctx;
  const { childNo } = args;

  const isParent = userRoles.includes('parent');

  if (isParent && childNo !== undefined) {
    await storage.clearStorage('expenses');
    return 'Cleared all';
  }

  const entries = await storage.getStorage('expenses');
  const mine = entries?.filter(e => e.addedBy === userId) || [];

  if (!mine.length) return 'Nothing to clear';

  for (const entry of mine) {
    await storage.deleteItem('expenses', entry._id);
  }

  return `Cleared ${mine.length}`;
}

export async function remove(ctx) {
  const { args, userId, storage, state, userRoles } = ctx;
  const { childNo, itemNos } = args;

  if (!itemNos || (Array.isArray(itemNos) && itemNos.length === 0)) {
    return 'Item number(s) required';
  }

  let entries = await storage.getStorage('expenses');
  if (!entries?.length) return 'No expenses';

  const isParent = userRoles.includes('parent');
  let targetUserId = userId;

  if (isParent && childNo !== undefined) {
    const children = await state.getUsersWithRole('child');
    if (childNo < 1 || childNo > children.length) return `Invalid child (1-${children.length})`;
    targetUserId = children[childNo - 1];
  }

  entries = entries.filter(e => e.addedBy === targetUserId);
  entries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  // Parse itemNos - handle both string (from interactive) and array (from command line)
  let itemNumbers;
  if (typeof itemNos === 'string') {
    // Parse comma-separated string like "1,2,3"
    itemNumbers = itemNos.split(',').map(s => {
      const num = parseInt(s.trim(), 10);
      return isNaN(num) ? null : num;
    }).filter(n => n !== null);
    console.log('TODO: its f')
  } else if (Array.isArray(itemNos)) {
    itemNumbers = itemNos.map(n => typeof n === 'number' ? n : parseInt(n, 10));
  } else {
    // Single number
    itemNumbers = [typeof itemNos === 'number' ? itemNos : parseInt(itemNos, 10)];
  }

  if (itemNumbers.length === 0) {
    return 'Invalid item number(s)';
  }

  // Validate all item numbers
  for (const itemNo of itemNumbers) {
    if (itemNo < 1 || itemNo > entries.length) {
      return `Invalid item number ${itemNo} (valid range: 1-${entries.length})`;
    }
  }

  // Get unique item numbers and sort in descending order to avoid index shifting issues
  const uniqueItemNos = [...new Set(itemNumbers)].sort((a, b) => b - a);
  
  // Collect entries to remove
  const entriesToRemove = uniqueItemNos.map(itemNo => entries[itemNo - 1]);
  
  // Delete all entries
  for (const entry of entriesToRemove) {
    await storage.deleteItem('expenses', entry._id);
  }

  // Calculate new total
  const allEntries = await storage.getStorage('expenses');
  const userEntries = allEntries.filter(e => e.addedBy === targetUserId);
  const total = userEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Format response
  if (entriesToRemove.length === 1) {
    const entry = entriesToRemove[0];
    return `Removed: ${entry.item} - ${entry.amount} (new total: ${total})`;
  } else {
    const removedList = entriesToRemove.map(e => `${e.item} (${e.amount})`).join(', ');
    return `Removed ${entriesToRemove.length} items: ${removedList} (new total: ${total})`;
  }
}

async function getChildrenList(storage, state) {
  const children = await state.getUsersWithRole('child');
  if (!children?.length) return { list: [], emptyMessage: 'No children' };

  const entries = await storage.getStorage('expenses') || [];
  const list = await Promise.all(
    children.map(async (childId) => {
      const childEntries = entries.filter(e => e.addedBy === childId);
      const total = childEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return {
        label: await state.resolveUserName(childId),
        sublabel: `${childEntries.length} items, ${total}`
      };
    })
  );

  return { list, emptyMessage: 'No children' };
}

export async function _interactiveContext_edit(ctx) {
  const { userId, storage, state, userRoles, currentArg, collectedArgs } = ctx;
  const entries = await storage.getStorage('expenses');

  if (!entries?.length) return { message: 'No expenses' };

  const isParent = userRoles.includes('parent');

  if (isParent && currentArg === 'childNo') {
    return await getChildrenList(storage, state);
  }

  let targetEntries = entries;
  if (isParent && collectedArgs.childNo) {
    const children = await state.getUsersWithRole('child');
    const idx = Number(collectedArgs.childNo) - 1;
    if (idx >= 0 && idx < children.length) {
      targetEntries = entries.filter(e => e.addedBy === children[idx]);
    }
  } else if (!isParent) {
    targetEntries = entries.filter(e => e.addedBy === userId);
  }

  targetEntries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  if (currentArg === 'itemNo') {
    return {
      list: targetEntries.map(e => ({ label: e.item, sublabel: String(e.amount) })),
      emptyMessage: 'No expenses'
    };
  }

  if ((currentArg === 'price' || currentArg === 'item') && collectedArgs.itemNo) {
    const idx = Number(collectedArgs.itemNo) - 1;
    if (idx >= 0 && idx < targetEntries.length) {
      const e = targetEntries[idx];
      return {
        selected: {
          label: `#${idx + 1} ${e.item}`,
          sublabel: String(e.amount)
        }
      };
    }
  }

  return null;
}

export async function _interactiveContext_list(ctx) {
  return null;
}

export async function _interactiveContext_clear(ctx) {
  const { storage, state, userRoles, currentArg } = ctx;

  if (userRoles.includes('parent') && currentArg === 'childNo') {
    return await getChildrenList(storage, state);
  }

  return null;
}

export async function _interactiveContext_remove(ctx) {
  const { userId, storage, state, userRoles, currentArg, collectedArgs } = ctx;
  const entries = await storage.getStorage('expenses');

  if (!entries?.length) return { message: 'No expenses' };

  const isParent = userRoles.includes('parent');

  if (isParent && currentArg === 'childNo') {
    return await getChildrenList(storage, state);
  }

  let targetEntries = entries;
  if (isParent && collectedArgs.childNo) {
    const children = await state.getUsersWithRole('child');
    const idx = Number(collectedArgs.childNo) - 1;
    if (idx >= 0 && idx < children.length) {
      targetEntries = entries.filter(e => e.addedBy === children[idx]);
    }
  } else if (!isParent) {
    targetEntries = entries.filter(e => e.addedBy === userId);
  }

  targetEntries.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  if (currentArg === 'itemNos') {
    return {
      list: targetEntries.map(e => ({ label: e.item, sublabel: String(e.amount) })),
      emptyMessage: 'No expenses'
    };
  }

  return null;
}