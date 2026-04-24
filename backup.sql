--
-- PostgreSQL database dump
--

\restrict AQy54z75Cxt84qAs6UequhBkYdBaIfihfvlcm8agRrY12hrCQMROPsiCaPZFKYV

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password text NOT NULL,
    phone character varying(20) NOT NULL,
    otp character varying(6),
    otp_expires_at timestamp without time zone
);


ALTER TABLE public.admin OWNER TO postgres;

--
-- Name: admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_id_seq OWNER TO postgres;

--
-- Name: admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_id_seq OWNED BY public.admin.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name text NOT NULL,
    phone character varying(20) NOT NULL,
    password text NOT NULL,
    referral_code character varying(10) NOT NULL,
    referred_by integer,
    referral_credits numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: family_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_members (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    name text NOT NULL,
    relation character varying(30) NOT NULL,
    age integer,
    blood_group character varying(10),
    allergies text,
    medical_conditions text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.family_members OWNER TO postgres;

--
-- Name: family_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.family_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.family_members_id_seq OWNER TO postgres;

--
-- Name: family_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.family_members_id_seq OWNED BY public.family_members.id;


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_records (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    family_member_id integer,
    member_name text,
    type character varying(30) NOT NULL,
    value text NOT NULL,
    unit character varying(20),
    recorded_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.health_records OWNER TO postgres;

--
-- Name: health_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.health_records_id_seq OWNER TO postgres;

--
-- Name: health_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_records_id_seq OWNED BY public.health_records.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    address text NOT NULL,
    notes text,
    credits_used numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category text NOT NULL,
    image_url text,
    stock integer DEFAULT 0 NOT NULL,
    dosage text,
    how_to_take text,
    side_effects text,
    requires_prescription boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date date,
    batch_number character varying(50),
    manufacturer text,
    cost_price numeric(10,2)
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: admin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin ALTER COLUMN id SET DEFAULT nextval('public.admin_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: family_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members ALTER COLUMN id SET DEFAULT nextval('public.family_members_id_seq'::regclass);


--
-- Name: health_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_records ALTER COLUMN id SET DEFAULT nextval('public.health_records_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin (id, username, password, phone, otp, otp_expires_at) FROM stdin;
1	fatima04786	imran@04786	8081176774	\N	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, name, phone, password, referral_code, referred_by, referral_credits, address, created_at) FROM stdin;
1	Test Customer	9999999999	test123	7FKQTE	\N	0.00	\N	2026-04-20 06:47:35.567677
2	Mohtashim	8687924003	Hello	UCESN7	\N	0.00	\N	2026-04-20 07:16:40.566864
3	Rahul 	7860152188	h	G6MWA6	\N	0.00	\N	2026-04-21 08:27:24.073988
\.


--
-- Data for Name: family_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.family_members (id, customer_id, name, relation, age, blood_group, allergies, medical_conditions, created_at) FROM stdin;
\.


--
-- Data for Name: health_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_records (id, customer_id, family_member_id, member_name, type, value, unit, recorded_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, quantity, price) FROM stdin;
1	1	1	Paracetamol 500mg	2	25.00
2	2	2	Amoxicillin 250mg	1	95.00
3	3	3	Vitamin D3 1000IU	1	140.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, customer_id, total_amount, payment_method, payment_status, status, address, notes, credits_used, created_at) FROM stdin;
1	2	50.00	upi	pending	confirmed	2 no Bagh behsa Lucknow 		0.00	2026-04-20 07:17:20.562989
2	2	95.00	upi	pending	pending	H		0.00	2026-04-20 07:19:57.975218
3	2	140.00	upi	pending	confirmed	H 		0.00	2026-04-21 07:08:25.819314
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, category, image_url, stock, dosage, how_to_take, side_effects, requires_prescription, is_active, created_at, expiry_date, batch_number, manufacturer, cost_price) FROM stdin;
4	Cetirizine 10mg	Antihistamine for allergy relief.	45.00	Allergy	\N	60	10mg once daily	Take once daily in the evening.	Drowsiness, dry mouth	f	t	2026-04-20 06:39:33.838353	2025-05-10	BT20240901	Dr. Reddy's	35.00
5	Omeprazole 20mg	Acid reflux and heartburn relief.	80.00	Gastro	\N	45	20mg once daily	Take 30 min before breakfast.	Headache, nausea	f	t	2026-04-20 06:39:33.838353	2026-12-31	BT20241001	Abbott	65.00
6	Ibuprofen 400mg	Anti-inflammatory pain relief.	55.00	Pain Relief	\N	75	400mg every 6-8 hrs	Take with food or milk.	Stomach upset	f	t	2026-04-20 06:39:33.838353	2025-03-20	BT20240701	Lupin	42.00
7	Metformin 500mg	Diabetes management tablet.	120.00	Diabetes	\N	40	500mg with meals	Take with meals to reduce stomach upset.	Nausea initially	t	t	2026-04-20 06:39:33.838353	2026-06-30	BT20241101	USV	95.00
8	Calcium + D3 Tablet	Bone health supplement.	165.00	Supplements	\N	55	1 tablet twice daily	Take with meals, 4-6 hours apart.	Constipation if overused	f	t	2026-04-20 06:39:33.838353	2027-01-15	BT20250101	Pfizer	130.00
1	Paracetamol 500mg	Fever and mild pain relief tablets.	25.00	Pain Relief	\N	118	500mg	Take 1 tablet every 4-6 hours. Max 4 per day.	Rare: nausea	f	t	2026-04-20 06:39:33.838353	2025-12-15	BT20241201	Sun Pharma	18.00
2	Amoxicillin 250mg	Prescription antibiotic course.	95.00	Antibiotic	\N	31	250mg 3x daily	Take with food every 8 hours. Complete full course.	Diarrhea, nausea	t	t	2026-04-20 06:39:33.838353	2024-11-01	BT20240801	Cipla	72.00
3	Vitamin D3 1000IU	Daily vitamin D supplement.	140.00	Supplements	\N	7	1000 IU daily	Take one capsule daily with a meal.	Rare at normal doses	f	t	2026-04-20 06:39:33.838353	2026-08-30	BT20241501	Mankind	115.00
\.


--
-- Name: admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_id_seq', 1, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 3, true);


--
-- Name: family_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.family_members_id_seq', 1, false);


--
-- Name: health_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_records_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 3, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 3, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 8, true);


--
-- Name: admin admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (id);


--
-- Name: admin admin_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_username_unique UNIQUE (username);


--
-- Name: customers customers_phone_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_unique UNIQUE (phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_referral_code_unique UNIQUE (referral_code);


--
-- Name: family_members family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict AQy54z75Cxt84qAs6UequhBkYdBaIfihfvlcm8agRrY12hrCQMROPsiCaPZFKYV

