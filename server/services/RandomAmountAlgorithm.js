/**
 * 随机金额分配算法（二倍均值法）
 * 
 * 算法原理：
 * 1. 假设剩余金额为 R，剩余个数为 N，最小金额为 m
 * 2. 每次分配的范围为 [m, 2*R/N - m]
 * 3. 保证后续每个人至少能拿到 m
 * 
 * 数学证明：
 * 设第 i 个人拿到的金额为 a_i ∈ [m, 2R_i/N_i - m]
 * 剩余 N_i - 1 人至少需要 (N_i - 1) * m
 * 所以 a_i ≤ R_i - (N_i - 1) * m
 * 因此 a_i ≤ 2R_i/N_i - m 成立 ✓
 */

class RandomAmountAlgorithm {
  /**
   * 生成随机金额数组
   * @param {number} totalAmount - 总金额（单位：分）
   * @param {number} totalCount - 总个数
   * @param {number} minAmount - 最小金额（单位：分），默认 1
   * @returns {number[]} 金额数组
   */
  generateRandomAmounts(totalAmount, totalCount, minAmount = 1) {
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('总金额必须大于0');
    }
    
    if (!Number.isFinite(totalCount) || totalCount < 1) {
      throw new Error('总数必须 >= 1');
    }
    
    if (!Number.isFinite(minAmount) || minAmount < 1) {
      throw new Error('最小金额必须 >= 1');
    }
    
    const minTotalAmount = totalCount * minAmount;
    if (totalAmount < minTotalAmount) {
      throw new Error(`总金额不足！至少需要 ${minTotalAmount} 分（${totalCount} × ${minAmount}）`);
    }
    
    const amounts = [];
    let remaining = totalAmount;
    let count = totalCount;
    
    for (let i = 0; i < totalCount; i++) {
      if (i === totalCount - 1) {
        // 最后一个拿走剩余全部
        amounts.push(remaining);
      } else {
        // 二倍均值法计算本次分配的最大值
        const maxForThis = Math.floor((2 * remaining / count) - minAmount);
        
        // 安全边界：确保不会超出实际剩余
        const actualMax = Math.min(maxForThis, remaining - minAmount * (count - 1));
        
        // 如果最大值小于最小值，说明参数有问题
        if (actualMax < minAmount) {
          throw new Error('分配失败：剩余金额不足以满足最小金额约束');
        }
        
        // 在 [minAmount, actualMax] 范围内生成随机数
        const amount = this._getRandomInt(minAmount, actualMax);
        amounts.push(amount);
        remaining -= amount;
        count--;
      }
    }
    
    return this._shuffleArray(amounts);
  }

  /**
   * 生成单个随机金额（用于实时领取场景）
   * @param {number} remainingAmount - 剩余总金额
   * @param {number} remainingCount - 剩余个数
   * @param {number} minAmount - 最小金额
   * @returns {number} 随机金额
   */
  generateSingleAmount(remainingAmount, remainingCount, minAmount = 1) {
    if (remainingCount <= 0) {
      throw new Error('剩余个数为0，无法继续分配');
    }
    
    if (remainingAmount <= 0) {
      throw new Error('剩余金额为0，无法继续分配');
    }
    
    if (remainingAmount < minAmount) {
      throw new Error(`剩余金额 ${remainingAmount} 小于最小金额 ${minAmount}`);
    }
    
    if (remainingCount === 1) {
      return remainingAmount;
    }
    
    const maxForThis = Math.floor((2 * remainingAmount / remainingCount) - minAmount);
    const actualMax = Math.min(maxForThis, remainingAmount - minAmount * (remainingCount - 1));
    
    if (actualMax < minAmount) {
      throw new Error('分配失败：剩余金额不足以满足最小金额约束');
    }
    
    return this._getRandomInt(minAmount, actualMax);
  }

  /**
   * 验证生成的金额数组是否合法
   * @param {number[]} amounts - 金额数组
   * @param {number} expectedTotal - 期望总额
   * @param {number} minAmount - 最小金额
   * @returns {{ valid: boolean, total: number, error?: string }}
   */
  validateAmounts(amounts, expectedTotal, minAmount = 1) {
    if (!Array.isArray(amounts)) {
      return { valid: false, total: 0, error: '输入不是数组' };
    }
    
    if (amounts.length === 0) {
      return { valid: false, total: 0, error: '数组为空' };
    }
    
    let total = 0;
    let allAboveMin = true;
    
    for (const amount of amounts) {
      if (!Number.isFinite(amount) || amount < 0) {
        return { valid: false, total, error: `非法金额值: ${amount}` };
      }
      
      if (amount < minAmount) {
        allAboveMin = false;
      }
      
      total += amount;
    }
    
    const tolerance = amounts.length; // 允许 ±N 分的误差（N 为人数）
    const diff = Math.abs(total - expectedTotal);
    
    if (diff > tolerance) {
      return {
        valid: false,
        total,
        error: `总额不匹配！期望 ${expectedTotal}，实际 ${total}，差值 ${diff}`
      };
    }
    
    if (!allAboveMin) {
      return {
        valid: false,
        total,
        error: `存在低于最小金额 (${minAmount}) 的项`
      };
    }
    
    return { valid: true, total };
  }

  /**
   * 获取随机整数 [min, max]（包含边界）
   * @private
   */
  _getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Fisher-Yates 洗牌算法
   * @private
   */
  _shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

module.exports = new RandomAmountAlgorithm();
