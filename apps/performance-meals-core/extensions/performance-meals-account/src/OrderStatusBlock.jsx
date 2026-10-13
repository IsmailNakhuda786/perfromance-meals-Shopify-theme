import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {APP_URL} from './app-endpoint.generated';

const SECTIONS = ['Dashboard', 'My Plan', 'Order History', 'Wallet', 'Rewards', 'Gift Cards', 'Settings'];

export default async () => { render(<Account/>, document.body); };

function Account() {
  const [section, setSection] = useState('Dashboard');
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const url = new URL(APP_URL);
        if (url.protocol !== 'https:') throw new Error('Invalid endpoint');
        const token = await shopify.sessionToken.get();
        const response = await fetch(new URL('/api/account', url), {
          headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Account unavailable');
        const data = await response.json();
        if (!Array.isArray(data.plans)) throw new Error('Invalid account response');
        setAccount(data);
      } catch (failure) {
        if (!(failure instanceof Error && failure.name === 'AbortError')) setError('Your account information could not be loaded. Please try again later.');
      }
    }
    load();
    return () => controller.abort();
  }, [refresh]);

  return <s-page heading="Performance Meals">
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="small">
        {SECTIONS.map(label => <s-button key={label} variant={section === label ? 'primary' : 'secondary'} onClick={() => setSection(label)}>{label}</s-button>)}
      </s-stack>
      {error && <s-banner tone="warning">{error}</s-banner>}
      {!account && !error && <s-spinner accessibilityLabel="Loading your account"/>}
      {section === 'Dashboard' && <s-section heading="Dashboard">
        <s-paragraph>Your Ready Series, Meal Plans and Gift Card purchases share one Performance Meals account.</s-paragraph>
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))" gap="base">
          <s-section heading="Active Plan"><s-paragraph>Your subscription status is not available here yet.</s-paragraph><s-button onClick={() => setSection('My Plan')}>Manage Plan</s-button></s-section>
          <s-section heading="Monetary Wallet">{renderWallet(account)}<s-button onClick={() => setSection('Wallet')}>Wallet</s-button></s-section>
        </s-grid>
      </s-section>}
      {section === 'My Plan' && <s-section heading="My Plan">
        <s-section heading="Ready Series"><s-paragraph>Ready Series subscription details are not available here yet.</s-paragraph></s-section>
        <s-section heading="Meal Plan">{renderPlans(account)}</s-section>
      </s-section>}
      {section === 'Order History' && <s-section heading="Order History"><s-paragraph>Your Ready Series, Meal Plan and Gift Card purchases remain together in your Shopify order history.</s-paragraph><s-link href="shopify:customer-account/orders">View all orders</s-link><OrderCancellations data={account?.cancellations} onUpdated={() => setRefresh(value => value + 1)}/></s-section>}
      {section === 'Wallet' && <s-section heading="Wallet">{renderWallet(account)}</s-section>}
      {section === 'Rewards' && <Rewards data={account} onUpdated={() => setRefresh(value => value + 1)}/>}
      {section === 'Gift Cards' && <s-section heading="Gift Cards"><s-paragraph>Your Gift Card purchases appear in your Shopify order history. Use your Gift Card code at checkout.</s-paragraph><GiftCardClaim enabled={account?.giftCardClaimsEnabled} onClaimed={() => setRefresh(value => value + 1)}/></s-section>}
      {section === 'Settings' && <s-section heading="Account Settings"><s-paragraph>Manage your personal details and saved addresses in your Shopify profile.</s-paragraph><s-link href="shopify:customer-account/profile">View profile</s-link></s-section>}
    </s-stack>
  </s-page>;
}

function renderPlans(account) {
  if (!account) return <s-paragraph>Your saved Meal Plans will appear when your account information loads.</s-paragraph>;
  if (!account.plans.length) return <s-paragraph>You have no saved Meal Plans yet.</s-paragraph>;
  return account.plans.map(plan => <s-section key={plan.id} heading={plan.programmeTitle || 'Programme details unavailable'}>
    {plan.startsOn && plan.endsOn && <s-paragraph>Programme: {plan.startsOn} – {plan.endsOn} · No automatic renewal</s-paragraph>}
    {plan.variantTitle && plan.variantTitle !== 'Default Title' && <s-paragraph>{plan.variantTitle}</s-paragraph>}
    <s-paragraph>{plan.status === 'CANCELLED' ? 'Cancelled' : plan.status === 'ORDERED' ? 'Order received' : 'Selections saved for checkout'}</s-paragraph>
    {!plan.menus?.length && plan.selections.map(window => <s-paragraph key={`${window.week}:${window.window}`}>{window.startsOn} · {window.meals.reduce((sum, meal) => sum + meal.quantity, 0)} meals</s-paragraph>)}
    {plan.menus?.map(menu => <s-section key={menu.block} heading={`${menu.startsOn} – ${menu.endsOn}`}>
      <s-paragraph>{menu.state === 'SAVED' ? 'My Menu' : 'Menu selections pending'}</s-paragraph>
      {menu.selections.map(window => <s-paragraph key={`${window.week}:${window.window}`}>{window.startsOn} · {{"mon-tue":"Mon – Tue","wed-thu":"Wed – Thu",fri:"Fri"}[window.window] || window.window} · {window.meals.map(meal => `${meal.name || 'Meal details unavailable'} ×${meal.quantity}`).join(' · ')}</s-paragraph>)}
      <s-link href={menu.url}>Browse</s-link>
    </s-section>)}
  </s-section>);
}

function OrderCancellations({data,onUpdated}) {
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  async function requestSupport(orderGid){
    if(pending)return;setPending(true);setMessage('');
    try{
      const token=await shopify.sessionToken.get();
      const response=await fetch(new URL('/api/order-support',APP_URL),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({orderGid})});
      if(!response.ok)throw Error();
      setMessage('Your request is recorded for Customer Support review. Your order and Wallet balance have not changed.');onUpdated();
    }catch{setMessage('Your request could not be confirmed. No cancellation or refund was performed.');}
    finally{setPending(false);}
  }
  return <s-section heading="Cancellation and refunds">
    <s-paragraph>Cancellation and refund requests require Customer Support review. Active prepaid terms and Meal Plans cannot be cancelled midway. No automatic Wallet refund is issued.</s-paragraph>
    <s-paragraph>For recurring Meal Plans, stopping future renewals is separate from a refund. Pause options depend on your subscription.</s-paragraph>
    <s-paragraph>Use Shopify’s Subscriptions menu to manage supported renewal and pause options.</s-paragraph>
    {data?.orders.map(order=><s-section key={order.id} heading={order.name}>
      <s-paragraph>{order.state==='COMPLETED'?'Historical cancellation · Wallet refund confirmed':order.supportState?'Support request recorded':'Contact Customer Support to request a cancellation or refund.'}</s-paragraph>
      {!order.state&&!order.supportState&&<s-button disabled={pending} onClick={()=>requestSupport(order.id)}>Request Support review</s-button>}
    </s-section>)}
    {message&&<s-paragraph>{message}</s-paragraph>}
  </s-section>;
}

function renderWallet(account) {
  if (!account) return <s-paragraph>Your Wallet balance is loading.</s-paragraph>;
  if (!account.nativeWallet) return <s-paragraph>Your Wallet balance is temporarily unavailable. Please try again later.</s-paragraph>;
  const {currency, balanceMinor} = account.nativeWallet;
  const balance = new Intl.NumberFormat('en-SG', {style: 'currency', currency, currencyDisplay: 'code'}).format(balanceMinor / 100);
  return <s-stack gap="base">
    <s-section heading="Wallet Balance"><s-paragraph>{balance}</s-paragraph></s-section>
    {account.walletHistoryPending && <s-paragraph>Your Wallet history is updating.</s-paragraph>}
    <s-paragraph>Your monetary balance is held as Shopify store credit. Promotional credits are kept separately.</s-paragraph>
    {account.walletLedger?.map(ledger => <s-section key={ledger.currency} heading="Transaction History">
      {ledger.history.length === 0 && <s-paragraph>No Wallet transactions yet.</s-paragraph>}
      {ledger.history.map(entry => <s-paragraph key={entry.id}>
        {new Date(entry.createdAt).toLocaleDateString('en-SG', {timeZone: 'Asia/Singapore'})} · {entry.fundedDelta < 0 ? 'Purchase' : entry.sourceKind === 'funded_return' ? 'Refund' : entry.sourceKind === 'gift_card_funded' ? 'Gift Card' : entry.sourceKind === 'customer_funded' ? 'Wallet top-up' : entry.sourceKind === 'reward_funded' ? 'Rewards redemption' : entry.sourceKind === 'bonus' ? 'Promotional credit' : 'Transaction'} · {new Intl.NumberFormat('en-SG', {style: 'currency', currency: ledger.currency, currencyDisplay: 'code'}).format((entry.fundedDelta + entry.bonusDelta) / 100)}
      </s-paragraph>)}
      {ledger.hasMore && <s-paragraph>Showing the latest 50 transactions.</s-paragraph>}
    </s-section>)}
  </s-stack>;
}

function GiftCardClaim({enabled, onClaimed}) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function redeem() {
    if (pending || !enabled) return;
    setPending(true);
    setMessage('');
    try {
      const token = await shopify.sessionToken.get();
      const response = await fetch(new URL('/api/gift-card-claim', APP_URL), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({code: code.trim().replace(/\s/g, '')}),
      });
      const result = await response.json();
      if (!response.ok || result.state !== 'COMPLETED') throw new Error('Transfer unconfirmed');
      setCode('');
      setMessage(result.alreadyCompleted ? 'This Gift Card has already been added to your Wallet.' : 'Gift Card value added to your Wallet.');
      onClaimed();
    } catch {
      setMessage('The transfer could not be confirmed. Check your Wallet history before trying again.');
    } finally {
      setPending(false);
    }
  }
  return <s-section heading="Redeem a Gift Card">
    {!enabled ? <s-paragraph>Gift Card to Wallet conversion is not available here yet.</s-paragraph> : <s-stack gap="base">
      <s-password-field label="Gift Card Code" autocomplete="off" value={code} disabled={pending} onInput={event => {
        const field = event.currentTarget;
        if (field && 'value' in field && typeof field.value === 'string') setCode(field.value);
      }}/>
      <s-button variant="primary" disabled={pending || !code.trim()} onClick={redeem}>Redeem</s-button>
      {pending && <s-spinner accessibilityLabel="Confirming Gift Card transfer"/>}
      {message && <s-paragraph>{message}</s-paragraph>}
    </s-stack>}
  </s-section>;
}

function Rewards({data,onUpdated}) {
  const [points,setPoints]=useState('');
  const [requestKey,setRequestKey]=useState(null);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  async function redeem(){
    if(pending||requestKey)return;
    const amount=Number(points);
    if(!/^\d+$/.test(points)||!Number.isSafeInteger(amount)||amount<10||amount%10){setMessage('Enter a positive multiple of 10 points.');return;}
    const key=crypto.randomUUID();setRequestKey(key);setPending(true);setMessage('');
    try{
      const token=await shopify.sessionToken.get();
      const response=await fetch(new URL('/api/rewards-redeem',APP_URL),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({points:amount,requestKey:key})});
      const result=await response.json();
      if(!response.ok||result.state!=='COMPLETED')throw Error();
      setMessage('Points redeemed into your Wallet.');setPoints('');setRequestKey(null);onUpdated();
    }catch{setMessage('Redemption could not be confirmed. Check your Rewards and Wallet history or contact Support before trying again.');onUpdated();}
    finally{setPending(false);}
  }
  return <s-section heading="Rewards">
    <s-paragraph>Earn 1 point per SGD 1 of eligible food value. Only direct customer payments and customer-funded Wallet principal earn points. Cents, delivery, Gift Card-funded, Reward-funded and promotional credit, Gift Card purchases and Wallet top-ups are excluded. Redeem 10 points for SGD 1 Wallet credit.</s-paragraph>
    {!data?.rewardsEnabled?<s-paragraph>Rewards earning and redemption are not available yet.</s-paragraph>:<s-stack gap="base">
      <s-paragraph>Points Balance: {data.rewards?.points ?? 'Unavailable'}</s-paragraph>
      <s-paragraph>Lifetime Earned: {data.rewards?.lifetimeEarned ?? 'Unavailable'}</s-paragraph>
      {data.rewards?.balanceMatchesLedger===false?<s-paragraph>Your Rewards history is updating.</s-paragraph>:<>
        <s-text-field label="Points to redeem" value={points} disabled={pending||!!requestKey} onInput={event=>setPoints(event.currentTarget.value)}/>
        <s-button variant="primary" disabled={pending||!!requestKey||!points||!data.rewards} onClick={redeem}>Redeem points</s-button>
      </>}
      {data.rewards?.history.map(entry=><s-paragraph key={entry.id}>{new Date(entry.createdAt).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore'})} · {entry.kind==='earned'?'Earned':entry.kind==='redeemed'?'Redeemed':'Adjustment'} · {entry.pointsDelta} pts</s-paragraph>)}
    </s-stack>}
    {pending&&<s-spinner accessibilityLabel="Redeeming points"/>}
    {message&&<s-paragraph>{message}</s-paragraph>}
  </s-section>;
}
