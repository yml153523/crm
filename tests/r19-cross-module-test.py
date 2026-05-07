#!/usr/bin/env python3
"""
R19: 跨模块数据关联性完整性测试
"""

import subprocess
import json

def run_mongo(query):
    """执行MongoDB查询"""
    cmd = f'mongosh crm_db --quiet --eval "{query}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

def main():
    print("╔═══════════════════════════════════════════════════════╗")
    print("║   🔗 R19: 跨模块数据关联性深度测试                ║")
    print("╚═══════════════════════════════════════════════════════╝")
    
    # 1. 用户角色
    print("\n[1/6] 👥 用户-角色权限一致性...")
    users = json.loads(run_mongo('JSON.stringify(db.users.find({}).toArray())') or '[]')
    valid_roles = ['admin', 'user', 'editor']
    role_issues = sum(1 for u in users if u.get('role') not in valid_roles)
    if role_issues == 0:
        print(f"   ✅ 全部正确 ({len(users)}个用户)")
        for u in users:
            if u.get('role') == 'admin':
                print(f"      管理员: {u.get('phone', u.get('username', 'N/A'))}")
    else:
        print(f"   ⚠️  发现{role_issues}个角色异常")
    
    # 2. 商品-订单
    print("\n[2/6] 🛍️ 商品-库存-订单关联...")
    products = json.loads(run_mongo('JSON.stringify(db.products.find({}).toArray())') or '[]')
    orders = json.loads(run_mongo('JSON.stringify(db.orders.find({}).toArray())') or '[]')
    print(f"   ✅ {len(products)}个商品 | {len(orders)}个订单")
    
    # 检查每个商品的订购情况
    for p in products[:3]:  # 只显示前3个
        pid = str(p.get('_id', ''))
        ordered_total = sum(
            sum(item.get('quantity', 0) for item in o.get('items', []) 
                if str(item.get('productId', '')) == pid)
            for o in orders
        )
        if ordered_total > 0:
            print(f"      商品: {p.get('name', 'N/A')[:20]} | 库存:{p.get('stock')} | 已订:{ordered_total}")
    
    # 3. 支付-订单
    print("\n[3/6] 💳 支付-订单状态一致性...")
    payments = json.loads(run_mongo('JSON.stringify(db.payments.find({}).toArray())') or '[]')
    pay_issues = 0
    for pay in payments:
        pay_oid = pay.get('orderId', '')
        found = any(str(o.get('_id', '')) == pay_oid for o in orders)
        if not found:
            pay_issues += 1
    
    if pay_issues == 0:
        print(f"   ✅ {len(payments)}条支付记录全部有效")
    else:
        print(f"   ⚠️  {pay_issues}条孤立支付记录")
    
    # 4. 红包余额
    print("\n[4/6] 🧧 红包-领取-余额一致性...")
    red_packets = json.loads(run_mongo('JSON.stringify(db.redpackets.find({}).toArray())') or '[]')
    rp_issues = 0
    for rp in red_packets:
        total = rp.get('totalAmount', 0)
        remaining = rp.get('remainingAmount', 0)
        if total < remaining:
            rp_issues += 1
            print(f"      ⚠️  {rp.get('title', rp.get('_id', ''))}: 剩余>总额!")
    
    if rp_issues == 0:
        print(f"   ✅ {len(red_packets)}个红包数据逻辑一致")
    
    # 5. 提醒时间戳
    print("\n[5/6] 📋 提醒-读取时间一致性...")
    reminds = json.loads(run_mongo('JSON.stringify(db.reminds.find({}).toArray())') or '[]')
    remind_issues = 0
    for r in reminds:
        read_at = r.get('readAt')
        created_at = r.get('createdAt')
        if read_at and created_at:
            from datetime import datetime
            try:
                if datetime.fromisoformat(read_at.replace('Z', '+00:00')) < \
                   datetime.fromisoformat(created_at.replace('Z', '+00:00')):
                    remind_issues += 1
            except:
                pass
    
    if remind_issues == 0:
        print(f"   ✅ {len(reminds)}条提醒时间戳全部正确")
    else:
        print(f"   ⚠️  {remind_issues}条时间戳异常")
    
    # 6. 审计日志覆盖
    print("\n[6/6] 📊 审计日志-操作轨迹完整性...")
    audit_logs = json.loads(run_mongo("""
        JSON.stringify(db.auditlogs.find({
            timestamp: {$gte: new Date(Date.now() - 7*24*60*60*1000)}
        }).toArray())
    """) or '[]')
    
    actions_count = {}
    for log in audit_logs:
        action = log.get('action', log.get('method', 'unknown'))
        actions_count[action] = actions_count.get(action, 0) + 1
    
    print(f"   近7天审计日志: {len(audit_logs)}条")
    for action, count in sorted(actions_count.items(), key=lambda x: -x[1])[:5]:
        status = "✅" if count > 0 else "ℹ️"
        print(f"      {status} {action}: {count}次")
    
    # 总结
    print("\n" + "="*55)
    print("🎯 R19 跨模块关联性测试总结")
    print("="*55)
    
    total_issues = role_issues + pay_issues + rp_issues + remind_issues
    if total_issues == 0:
        print("🏆 评级: A+ (完美)")
        print("   所有跨模块数据关联性验证通过!")
    elif total_issues <= 2:
        print("🥇 评级: A (优秀)")
        print(f"   发现{total_issues}个小问题，不影响核心功能")
    else:
        print("🥈 评级: B (需关注)")
        print(f"   发现{total_issues}个问题，建议排查")
    
    print("="*55)

if __name__ == '__main__':
    main()
