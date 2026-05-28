const btnCart=document.querySelector('#cart-icon');
const cart=document.querySelector('.cart');
const btnClose=document.querySelector('#cart-close');

btnCart.addEventListener('click',()=>{
  cart.classList.add('cart-active');
});

btnClose.addEventListener('click',()=>{
  cart.classList.remove('cart-active');
});

document.addEventListener('DOMContentLoaded',loadshoe);

function loadshoe(){

  itemList.forEach((product) => {

    let newProductElement = createCartProduct(
      product.title,
      product.price,
      product.imgSrc,
      product.remove_shoe
    );

    let element = document.createElement('div');
    element.innerHTML = newProductElement;

    let cartBasket = document.querySelector('.cart-content');
    cartBasket.append(element);
  });

  loadContent();
}

function loadContent(){
  //Remove shoe Items From Cart
  let btnRemove=document.querySelectorAll('.cart-remove');
  btnRemove.forEach((btn)=>{
    btn.addEventListener('click',removeItem);
  });

  //Product Item Change Event
  let qtyElements=document.querySelectorAll('.cart-quantity');
  qtyElements.forEach((input)=>{
    input.addEventListener('change',changeQty);
  });

  // Product Cart
let cartBtns = document.querySelectorAll('.add-cart');

cartBtns.forEach((btn) => {
  btn.addEventListener('click', addCart);
});

// Wishlist Buttons
let wishlistBtns = document.querySelectorAll('.wishlist-btn');

wishlistBtns.forEach((btn) => {
  btn.addEventListener('click', toggleWishlist);
});
updateTotal();
}
function showToast(message){

  const toast = document.createElement('div');

  toast.classList.add('toast');

  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');

    setTimeout(() => {
      toast.remove();
    }, 400);

  }, 3000);
}


//Remove Item
function removeItem(){
  if(confirm('Are Your Sure to Remove')){
    let title=this.parentElement.querySelector('.cart-shoe-title').innerHTML;
    itemList=itemList.filter(el=>el.title!=title);
    localStorage.setItem("cartItems", JSON.stringify(itemList));
    this.parentElement.remove();
    showToast("Product removed from cart");
    loadContent();
  }
}

//Change Quantity
function changeQty(){
  if(isNaN(this.value) || this.value<1){
    this.value=1;
  }
  localStorage.setItem("cartItems", JSON.stringify(itemList));
  loadContent();
}

let itemList = JSON.parse(localStorage.getItem("cartItems")) || [];
let wishlist = [];

//Add Cart
function toggleWishlist() {
  const card = this.closest('.shoe-box');
  const title = card.querySelector('.shoe-title').textContent;

  if (wishlist.includes(title)) {
    wishlist = wishlist.filter(item => item !== title);
    this.classList.remove('active');
    showToast("Removed from wishlist");
  } else {
    wishlist.push(title);
    this.classList.add('active');
    showToast("Added to wishlist");
  }

  updateWishlistCount();
}
function updateWishlistCount() {
  const count = document.querySelector('#wishlist-count');

  count.textContent = wishlist.length;

  if (wishlist.length === 0) {
    count.style.display = 'none';
  } else {
    count.style.display = 'block';
  }
}
function addCart(){
  let shoe=this.parentElement;
  let title=shoe.querySelector('.shoe-title').innerHTML;
  let price=shoe.querySelector('.shoe-price').innerHTML;
  let imgSrc=shoe.querySelector('.shoe-img').src;

  let remove_shoe=shoe.querySelector('.remove_icon').src;
//console.log(title,price,imgSrc);

  let newProduct={title,price,imgSrc,remove_shoe}

 //Check Product already Exist in Cart
  if(itemList.find((el)=>el.title==newProduct.title)){
  showToast("Product already added to cart");
  return;
  }else{
  itemList.push(newProduct);
  showToast("Product added to cart");
  localStorage.setItem("cartItems", JSON.stringify(itemList));
  }


let newProductElement= createCartProduct(title,price,imgSrc,remove_shoe);
let element=document.createElement('div');
element.innerHTML=newProductElement;
let cartBasket=document.querySelector('.cart-content');
cartBasket.append(element);
loadContent();
}


function createCartProduct(title,price,imgSrc,remove_shoe){

  return `
  <div class="cart-box">
  <img src="${imgSrc}" class="cart-img">
  <div class="detail-box">
    <div class="cart-shoe-title">${title}</div>
    <div class="price-box">
      <div class="cart-price">${price}</div>
      <div class="cart-amt">${price}</div>
  </div>
    <input type="number" value="1" class="cart-quantity">
  </div>
  <ion-icon name="trash" class="cart-remove"><img src="${remove_shoe}" style="width:10px"></ion-icon>
</div>
  `;
}

function updateTotal()
{
  const cartItems=document.querySelectorAll('.cart-box');
  const totalValue=document.querySelector('.total-price');

  let total=0;

  cartItems.forEach(product=>{
    let priceElement=product.querySelector('.cart-price');
    let price=parseFloat(priceElement.innerHTML.replace("Rs.",""));
    let qty=product.querySelector('.cart-quantity').value;
    total+=(price*qty);
    product.querySelector('.cart-amt').innerText="Rs."+(price*qty);

  });

  totalValue.innerHTML='Rs.'+total;


  // Add Product Count in Cart Icon

  const cartCount=document.querySelector('.cart-count');
  let count=itemList.length;
  cartCount.innerHTML=count;

  if(count==0){
    cartCount.style.display='none';
  }else{
    cartCount.style.display='block';
  }


}

const buyBtn = document.querySelector('.btn-buy');
const checkoutModal = document.querySelector('.checkout-modal');
const closeCheckout = document.querySelector('.close-checkout');
const submitOrder = document.querySelector('#submit-order');

buyBtn.addEventListener('click', () => {
  checkoutModal.style.display = 'flex';
});

closeCheckout.addEventListener('click', () => {
  checkoutModal.style.display = 'none';
});

submitOrder.addEventListener('click', () => {

  const fullName = document.querySelector('#full-name').value;
  const address = document.querySelector('#address').value;
  const phone = document.querySelector('#phone').value;
  const payment = document.querySelector('#payment-method').value;

  if(fullName === '' || address === '' || phone === '' || payment === ''){
    alert('Please fill all fields');
    return;
  }

  showToast('Order placed successfully!');

  checkoutModal.style.display = 'none';
});
const searchInput = document.querySelector('#search-input');

searchInput.addEventListener('keyup', () => {

  const searchValue = searchInput.value.toLowerCase();

  const products = document.querySelectorAll('.shoe-box');

  let matchFound = false;

  products.forEach((product) => {

    const title = product
      .querySelector('.shoe-title')
      .textContent
      .toLowerCase();

    if(title.includes(searchValue)){

      product.style.display = 'block';
      matchFound = true;

    } else {

      product.style.display = 'none';

    }

  });

  const noProductsMessage =
    document.querySelector('#no-products-message');

  if(matchFound){
    noProductsMessage.style.display = 'none';
  } else {
    noProductsMessage.style.display = 'block';
  }

});
const submitOrder = document.querySelector('#submit-order');
const clearCartBtn = document.querySelector('.clear-cart-btn');
clearCartBtn.addEventListener('click', () => {

  const cartContent = document.querySelector('.cart-content');

  cartContent.innerHTML = '';

  itemList = [];

  localStorage.removeItem("cartItems");

  updateTotal();

});