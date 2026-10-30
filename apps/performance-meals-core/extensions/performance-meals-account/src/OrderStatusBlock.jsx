import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState, useRef} from 'preact/hooks';
import {createRenewalStopClient} from './renewal-stop-client';
import {loadOrderSupportHistory} from './order-support-history-client';
import {PrepaidPrice} from './PrepaidPrice.jsx';
import {ReadyDeliveries} from './ReadyDeliveries.jsx';
import {ProgrammeBookings} from './ProgrammeBookings.jsx';
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
    setError('');setAccount(null);
    const timeout=setTimeout(()=>{
      setError('Your account information could not be loaded. Please try again later.');
      controller.abort();
    },30000);
    async function load() {
      try {
        const url = new URL(APP_URL);
        if (url.protocol !== 'https:') throw new Error('Invalid endpoint');
        const token = await shopify.sessionToken.get();
        if(controller.signal.aborted)return;
        const endpoint=new URL('/api/account',url);endpoint.searchParams.set('orderSupport','separate');
        const response = await fetch(endpoint, {
          headers: {Authorization: `Bearer ${token}`}, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Account unavailable');
        const data = await response.json();
        if(controller.signal.aborted)return;
        if (!Array.isArray(data.plans)) throw new Error('Invalid account response');
        setAccount(data);
      } catch (failure) {
        if (!(failure instanceof Error && failure.name === 'AbortError')) setError('Your account information could not be loaded. Please try again later.');
      } finally { clearTimeout(timeout); }
    }
    load();
    return () => {clearTimeout(timeout);controller.abort();};
  }, [refresh]);

  return <s-page heading="Performance Meals">
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="small">
        {SECTIONS.map(label => <s-button key={label} variant={section === label ? 'primary' : 'secondary'} onClick={() => setSection(label)}>{label}</s-button>)}
      </s-stack>
      {error && <s-banner tone="warning">{error}<s-button onClick={()=>setRefresh(value=>value+1)}>Retry loading account</s-button></s-banner>}
      {!account && !error && <s-spinner accessibilityLabel="Loading your account"/>}
      {section === 'Dashboard' && <s-section heading="Dashboard">
        <s-paragraph>Your Ready Series, Meal Plans and Gift Card purchases share one Performance Meals account.</s-paragraph>
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))" gap="base">
          <s-section heading="Active Plan">{renderSubscriptions(account,undefined,undefined)}<s-button onClick={() => setSection('My Plan')}>Manage Plan</s-button></s-section>
          <s-section heading="Monetary Wallet">{renderWallet(account)}<s-button onClick={() => setSection('Wallet')}>Wallet</s-button></s-section>
        </s-grid>
      </s-section>}
      {section === 'My Plan' && <s-section heading="My Plan">
        <s-section heading="Ready Series">{account?.readyDeliveriesAvailable&&<ReadyDeliveries/>}{renderSubscriptions(account,'ready_series',()=>setRefresh(value=>value+1))}</s-section>
        <s-section heading="Meal Plan">{renderSubscriptions(account,'meal_plan',()=>setRefresh(value=>value+1))}{renderPlans(account)}</s-section>
      </s-section>}
      {section === 'Order History' && <s-section heading="Order History"><s-paragraph>Your Ready Series, Meal Plan and Gift Card purchases remain together in your Shopify order history.</s-paragraph><s-link href="shopify:customer-account/orders">View all orders</s-link><OrderSupportHistory onUpdated={() => setRefresh(value => value + 1)}/></s-section>}
      {section === 'Wallet' && <s-section heading="Wallet">{renderWallet(account)}</s-section>}
      {section === 'Rewards' && <Rewards data={account} onUpdated={() => setRefresh(value => value + 1)}/>}
      {section === 'Gift Cards' && <s-section heading="Gift Cards"><s-paragraph>Your Gift Card purchases appear in your Shopify order history. Only the named recipient may claim the full remaining Gift Card value into Wallet. The Wallet credit keeps the original Gift Card expiry date.</s-paragraph><GiftCardClaim accountLoaded={!!account} accountError={!!error} enabled={account?.giftCardClaimsEnabled} blocked={!account?.nativeWallet||account?.walletHistoryPending||account?.walletCreditPending} onClaimed={() => setRefresh(value => value + 1)}/></s-section>}
      {section === 'Settings' && <s-section heading="Account Settings"><s-paragraph>Manage your personal details and saved addresses in your Shopify profile.</s-paragraph><s-link href="shopify:customer-account/profile">View profile</s-link></s-section>}
    </s-stack>
  </s-page>;
}

function renderPlans(account) {
  if (!account) return <s-paragraph>Your saved Meal Plans will appear when your account information loads.</s-paragraph>;
  if (!account.plans.length) return <s-paragraph>You have no saved Meal Plans yet.</s-paragraph>;
  return account.plans.map(plan => <s-section key={plan.id} heading={plan.programmeTitle || 'Programme details unavailable'}>
    {plan.startsOn && plan.endsOn && <s-paragraph>Programme: {plan.startsOn} – {plan.endsOn} · No automatic renewal</s-paragraph>}
    {plan.entitlement && <s-paragraph>Includes {plan.entitlement.weekdayMeals} weekday meals and {plan.entitlement.frozenMeals} frozen meals ({plan.entitlement.totalMeals} meals total). Frozen deliveries follow your menu or merchant arrangements.</s-paragraph>}
    {account.programmeBookingsAvailable&&plan.status==='ORDERED'&&plan.entitlement&&<ProgrammeBookings selectionId={plan.id}/>}
    {plan.deliveryProgress?.available && <s-section heading="Meal deliveries">
      <s-paragraph>Sent: {plan.deliveryProgress.dispatchedWeekday} of 88 weekday meals and {plan.deliveryProgress.dispatchedFrozen} of 32 frozen meals.</s-paragraph>
      {plan.deliveryProgress.batches.filter(batch=>batch.state==='DISPATCHED').map((batch,index)=><s-paragraph key={index}>{new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium'}).format(new Date(batch.dispatchedAt))} · {batch.weekdayMeals} weekday meals · {batch.frozenMeals} frozen meals</s-paragraph>)}
    </s-section>}
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

function OrderSupportHistory({onUpdated}) {
 const [data,setData]=useState(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');
  loadOrderSupportHistory({origin:APP_URL,getToken:()=>shopify.sessionToken.get(),signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(()=>{if(!controller.signal.aborted)setError('Your order Support history could not be loaded. Please retry or contact Support.');});
  return()=>controller.abort();
 },[refresh]);
 return <>
  {!data&&!error&&<s-spinner accessibilityLabel="Loading order Support history"/>}
  {error&&<s-banner tone="warning">{error}<s-button onClick={()=>setRefresh(v=>v+1)}>Retry order history</s-button></s-banner>}
  <OrderCancellations data={data} onUpdated={()=>{setRefresh(v=>v+1);onUpdated();}}/>
 </>;
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
    {data?.hasMore&&<s-paragraph>Showing your ten most recent orders. Use “View all orders” above for older purchases, or contact Support.</s-paragraph>}
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
    {account.walletHistoryPending && <s-paragraph>We’re checking your Wallet history. Contact Support if this continues.</s-paragraph>}
    {account.walletCreditPending && <s-paragraph>A previous Wallet transfer needs checking. Please contact Support before adding more credit.</s-paragraph>}
    <s-paragraph>Use your available Wallet balance at checkout while signed in.</s-paragraph>
    {account.walletLedger?.map(ledger => <s-section key={ledger.currency} heading="Transaction History">
      {ledger.history.length === 0 && <s-paragraph>No Wallet transactions yet.</s-paragraph>}
      {ledger.history.map(entry => <s-paragraph key={entry.id}>
        {new Date(entry.createdAt).toLocaleDateString('en-SG', {timeZone: 'Asia/Singapore'})} · {entry.sourceKind === 'funded_expiry' ? 'Expired credit' : entry.fundedDelta < 0 ? 'Purchase' : entry.sourceKind === 'funded_return' ? 'Refund' : entry.sourceKind === 'gift_card_funded' ? 'Gift Card' : entry.sourceKind === 'customer_funded' ? 'Wallet top-up' : entry.sourceKind === 'reward_funded' ? 'Rewards redemption' : entry.sourceKind === 'bonus' ? 'Promotional credit' : 'Transaction'} · {new Intl.NumberFormat('en-SG', {style: 'currency', currency: ledger.currency, currencyDisplay: 'code'}).format((entry.fundedDelta + entry.bonusDelta) / 100)}
      </s-paragraph>)}
      {ledger.hasMore && <s-paragraph>Showing the latest 50 transactions.</s-paragraph>}
    </s-section>)}
  </s-stack>;
}

function GiftCardClaim({accountLoaded, accountError, enabled, blocked, onClaimed}) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function redeem() {
    if (pending || !enabled || blocked) return;
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
    {message && <s-paragraph>{message}</s-paragraph>}
    {!accountLoaded ? <s-paragraph>{accountError ? 'Your account could not be loaded. Use Retry loading account above before redeeming.' : 'Checking your account before Gift Card redemption…'}</s-paragraph> : !enabled ? <s-paragraph>Gift Card to Wallet conversion is not available here yet.</s-paragraph> : <s-stack gap="base">
      {blocked && <s-paragraph>Your Wallet needs checking before another transfer. Please contact Support.</s-paragraph>}
      <s-password-field label="Gift Card Code" autocomplete="off" value={code} disabled={pending || blocked} onInput={event => {
        const field = event.currentTarget;
        if (field && 'value' in field && typeof field.value === 'string') setCode(field.value);
      }}/>
      <s-button variant="primary" disabled={pending || blocked || !code.trim()} onClick={redeem}>Redeem</s-button>
      {pending && <s-spinner accessibilityLabel="Confirming Gift Card transfer"/>}
    </s-stack>}
  </s-section>;
}

function Rewards({data,onUpdated}) {
  const [points,setPoints]=useState('');
  const [requestKey,setRequestKey]=useState(null);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  const walletReady=!!data?.nativeWallet&&!data.walletHistoryPending&&!data.walletCreditPending;
  async function redeem(){
    if(pending||requestKey||!walletReady||!data?.rewardsEnabled||data.rewards?.balanceMatchesLedger!==true)return;
    const amount=Number(points);
    if(!/^\d+$/.test(points)||!Number.isSafeInteger(amount)||amount<1){setMessage('Enter a positive whole number of points.');return;}
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
    <s-paragraph>Earn 1 point per SGD 1 of eligible food value, including food GST paid with qualifying customer money. Only direct customer payments and customer-funded Wallet principal earn points. Cents, delivery and delivery tax, Gift Card-funded, Reward-funded and promotional credit, Gift Card purchases and Wallet top-ups are excluded. Redeem 10 points for SGD 1 Wallet credit.</s-paragraph>
    {!data?.rewardsEnabled&&<s-paragraph>Rewards earning and redemption are not available yet.</s-paragraph>}
    {data?.rewardsEnabled&&!walletReady&&<s-paragraph>Your Wallet needs checking before points can be redeemed. Please contact Support.</s-paragraph>}
    <s-stack gap="base">
      <s-paragraph>Points Balance: {data?.rewards?.points ?? 'Unavailable'}</s-paragraph>
      <s-paragraph>Lifetime Earned: {data?.rewards?.lifetimeEarned ?? 'Unavailable'}</s-paragraph>
      {data?.rewards?.balanceMatchesLedger===false&&<s-paragraph>Your Rewards history is updating.</s-paragraph>}
      {data?.rewardsEnabled&&data.rewards?.balanceMatchesLedger===true&&<>
        <s-text-field label="Points to redeem" value={points} disabled={pending||!!requestKey||!walletReady} onInput={event=>{const field=event.currentTarget;if(field&&'value' in field)setPoints(String(field.value));}}/>
        {/^[0-9]+$/.test(points)&&Number.isSafeInteger(Number(points))&&Number(points)>0&&<s-paragraph>Wallet credit: {new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',currencyDisplay:'code'}).format(Number(points)/10)}</s-paragraph>}
        <s-button variant="primary" disabled={pending||!!requestKey||!walletReady||!points||!data.rewards} onClick={redeem}>Redeem points</s-button>
      </>}
      {data?.rewards?.history.map(entry=><s-paragraph key={entry.id}>{new Date(entry.createdAt).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore'})} · {entry.kind==='earned'?'Earned':entry.kind==='redeemed'?'Redeemed':'Adjustment'} · {entry.pointsDelta} pts</s-paragraph>)}
    </s-stack>
    {pending&&<s-spinner accessibilityLabel="Redeeming points"/>}
    {message&&<s-paragraph>{message}</s-paragraph>}
  </s-section>;
}

function renderSubscriptions(account,stream,onUpdated){
  if(!account)return null;
  if(account.subscriptionHistoryPending)return <s-paragraph>Linked subscription details could not be verified. Please use Shopify’s Subscriptions menu or contact Support.</s-paragraph>;
  const records=(account.subscriptions||[]).filter(record=>!stream||record.streams.includes(stream));
  if(!records.length)return <s-paragraph>No linked subscription details are available here. Other subscriptions remain in Shopify’s Subscriptions menu.</s-paragraph>;
  const labels={ACTIVE:'Active',PAUSED:'Paused',CANCELLED:'Future renewals stopped',EXPIRED:'Expired',FAILED:'Payment issue'};
  return <s-stack direction="block" gap="small">{records.map(record=><s-section key={record.id} heading="Linked subscription"><s-paragraph>Status: {labels[record.status]||'Unavailable'}</s-paragraph><PrepaidPrice pricing={record.pricing} status={record.status}/>{record.lines.map(line=><s-paragraph key={line.id}>{line.title} × {line.quantity}</s-paragraph>)}<s-paragraph>Use Shopify’s Subscriptions menu or contact Support for available management options.</s-paragraph>{onUpdated&&<StopFutureRenewals record={record} onUpdated={onUpdated}/>}</s-section>)}</s-stack>;
}


function StopFutureRenewals({record,onUpdated}){
 const [opened,setOpened]=useState(false),[confirmed,setConfirmed]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[finished,setFinished]=useState(false);
 const client=useRef(null),attempted=useRef(false);
 async function submit(){
  if(!confirmed||finished||attempted.current)return;attempted.current=true;
  try{
   if(!client.current)client.current=createRenewalStopClient({origin:APP_URL,contractGid:record.id,getToken:()=>shopify.sessionToken.get()});
   setPending(true);setMessage('');
   const result=await client.current.submit(true);setFinished(true);
   setMessage(result.futureRenewalsStopped?'Future renewals are stopped. Your paid deliveries remain in place. No refund or Wallet credit was issued.':'The renewal change could not be confirmed. Check your account or contact Support before trying again.');
   if(result.futureRenewalsStopped)onUpdated();
  }catch{setFinished(true);setMessage('The renewal change could not be confirmed. Contact Support before trying again.');}
  finally{setPending(false);}
 }
 if(record.renewalStop?.reviewRequired)return <s-paragraph>Your renewal change needs Support review. No additional cancellation request will be sent.</s-paragraph>;
 if(record.renewalStop?.canStop!==true||!['ACTIVE','PAUSED'].includes(record.status))return null;
 return <s-stack gap="small" direction="block">
  {!opened&&<s-button onClick={()=>setOpened(true)}>Stop future renewals</s-button>}
  {opened&&<>
   <s-paragraph>This stops the next automatic package purchase. It does not cancel deliveries already paid for, pause those deliveries or give a refund or Wallet credit.</s-paragraph>
   <s-checkbox label="I want to stop future automatic renewals and keep my paid deliveries." checked={confirmed} disabled={pending||finished} onChange={event=>{const field=event.currentTarget;if(field&&'checked' in field)setConfirmed(field.checked===true);}}/>
   <s-button disabled={!confirmed||pending||finished} onClick={submit}>Confirm stop future renewals</s-button>
  </>}
  {pending&&<s-spinner accessibilityLabel="Confirming renewal change"/>}
  {message&&<s-paragraph>{message}</s-paragraph>}
 </s-stack>;
}
